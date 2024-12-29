import React, { useState, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Image, Keyboard } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Colors } from '@/constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set up notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

type Task = {
  id: string;
  name: string;
  completed: boolean;
  location: { latitude: number; longitude: number } | null;
  address: string | null;
  notified: boolean;
  description: string | null;
};


const TaskMap = () => {
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mapVisible, setMapVisible] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locMenuVisible, setLocMenuVisible] = useState(false);
  const [descMenuVisible, setDescMenuVisible] = useState(false);
  const [favoriteLocations, setFavoriteLocations] = useState<
    { name: string; location: { latitude: number; longitude: number }; address: string; }[]
  >([]);
  const [favoritesListVisible, setFavoritesListVisible] = useState(false);
  const [showCheckMark, setShowCheckMark] = useState(false);

  // Load favorite locations from AsyncStorage on startup
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const storedFavorites = await AsyncStorage.getItem('favoriteLocations');
        if (storedFavorites) {
          setFavoriteLocations(JSON.parse(storedFavorites));
        }
      } catch (error) {
        console.error('Failed to load favorite locations:', error);
      }
    };

    loadFavorites();
  }, [favoritesListVisible]);


  useEffect(() => {
      let locationSubscription: { remove: any; };
  
      (async () => {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.error('Permission to access location was denied');
          return;
        }
  
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,  // Update location every 1 second
            distanceInterval: .5, // Update when user moves 1 meter
          },
          (loc) => {
            setUserLocation(loc.coords); 
          }
        );
      })();
      return () => {
        if (locationSubscription) {
          locationSubscription.remove();
        }
      };
    }, []);

  // Load tasks from async storage
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem('Tasks');
        if (storedTasks) {
          setTasks(JSON.parse(storedTasks));
        }
      } catch (error) {
        console.error('Failed to load tasks:', error);
      }
    };

    loadTasks();
  }, []);

  // Save tasks to async storage
  useEffect(() => {
    const saveTasks = async () => {
      try {
        await AsyncStorage.setItem(
          'Tasks',
          JSON.stringify(tasks)
        );
      } catch (error) {
        console.error('Failed to save tasks:', error);
      }
    };

    saveTasks();
  }, [tasks]);


  // Get user's current location
  const getCurrentLocation = async () => {
    const location = await Location.getCurrentPositionAsync({});
    setUserLocation({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
  };
  
  // Check proximity to task locations
  const checkProximityToTasks = async (location: { latitude: number; longitude: number }) => {
    tasks.forEach((task) => {
      if (task.location) {
        const distance = getDistance(location, task.location);
        if (distance <= 1609.34 && task.notified == false) {
          sendProximityNotification(task);
          task.notified = true;
        }
        else if (distance >= 1609.34 && task.notified == true){
          task.notified = false;
        }
      }
    });
  };

  // Send notification when within proximity
  const sendProximityNotification = async (task: Task) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'You’re close to a task location!',
        body: `Task: ${task.name}`,
        data: { taskId: task.id },
      },
      trigger: null, // Immediate notification
    });
  };

  // Calculate distance between two locations (Haversine formula)
  const getDistance = (
    location1: { latitude: number; longitude: number },
    location2: { latitude: number; longitude: number }
  ) => {
    const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
    const earthRadius = 6371e3; // Earth's radius in meters

    const dLat = toRadians(location2.latitude - location1.latitude);
    const dLon = toRadians(location2.longitude - location1.longitude);

    const lat1 = toRadians(location1.latitude);
    const lat2 = toRadians(location2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = earthRadius * c;

    return distance; // Returns distance in meters
  };

  // Open the map and fetch the user's location
  const openMap = async () => {
    setMapVisible(true);
  };

  // Open the location menu
  const openLocMenu = async (taskId: string) => {
    // open modal with selection for favorite locations
    await getCurrentLocation(); // Fetch user's location
    setSelectedLocation(userLocation);
    setLocMenuVisible(true);
    setTaskBeingEdited(taskId);
  };

  // Handle map location selection
  const handleLocationSelect = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coordinate = e.nativeEvent.coordinate;
    setSelectedLocation(coordinate);
  };

  // Save the selected location to the task
  const saveLocation = () => {

    setTasks(
      tasks.map((item) =>
        item.id === taskBeingEdited
          ? { ...item, location: selectedLocation }
          : item
      )
    );

    // Save address value to the task
    if(selectedLocation){
      (async () => {
        try {
          const address = await Location.reverseGeocodeAsync(selectedLocation);
          console.debug('Address:', address[0].formattedAddress);
          setTasks(
            tasks.map((item) =>
              item.id === taskBeingEdited
                ? { ...item, address: address[0].formattedAddress }
                : item
            )
          );
        } catch (error) {
          console.error('Failed to save address:', error);
        }
      })();
    }
    
    setLocMenuVisible(false);
    if(mapVisible){
      setMapVisible(false);
    }
    setSelectedLocation(null);
  };

  const addTask = () => {
    if (task.trim()) {
      setTasks([...tasks, { id: Date.now().toString(), name: task, completed: false, location: null, 
                            notified: false, description: null, address: null }]);
      setTask('');
    }
  };

  const completeTask = (id: string) => {
    setTasks(
      tasks.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
    setDescMenuVisible(false);
  };

  const deleteTask = (id: string) => {
    setDescMenuVisible(false);
    setTasks(tasks.filter((item) => item.id !== id));
  };

  if(userLocation && tasks.length > 0){
    checkProximityToTasks({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    }); 
  }

  const openDescMenu = (id: string) => {
    setDescMenuVisible(true);
    setTaskBeingEdited(id);
  };

  const getTaskLocation = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task && task.address) {
      if (favoriteLocations.find((item) => item.address === task.address)) {
        return favoriteLocations.find((item) => item.address === task.address)?.name;
      }
      return task.address;
    }
    return 'No location set';
  };

  const openFavoriteModal = () => {
    setFavoritesListVisible(true);
  };

  const handleFavoriteSelect = (location: { latitude: number; longitude: number }, address: string) => {
    setTasks(
      tasks.map((item) =>
        item.id === taskBeingEdited
          ? { ...item, location: location, address: address}
          : item
      )
    );
    setFavoritesListVisible(false);
    setLocMenuVisible(false);
  };

  const clearCompletedTasks = () => {
    setTasks(tasks.filter((item) => !item.completed));
  };

  const getTaskName = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task) {
      return task.name;
    }
    return '';
  };

  const getTaskCompelted = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task) {
      return task.completed;
    }
    return false;
  };

  const setDesc = (desc: string) => {
    setTasks(
      tasks.map((item) =>
        item.id === taskBeingEdited
          ? { ...item, description: desc }
          : item
      )
    );
  };

  const saveDescription = () => {
    // Save the description logic here
    setShowCheckMark(true);
    setTimeout(() => setShowCheckMark(false), 2000); // Hide the check mark after 2 seconds
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new task"
          value={task}
          onChangeText={setTask}
        />
        <TouchableOpacity style={styles.addTaskButton} onPress={addTask}>
          <Image source={require('@/assets/images/add.png')} style={styles.addTaskImage}/>
        </TouchableOpacity>
      </View>
      <Text style={styles.homeHeader}>To Do Tasks</Text>
      <FlatList
        data={tasks ? tasks.filter((item) => !item.completed) : tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskContainer}>
            <TouchableOpacity onPress={() => openDescMenu(item.id)}>
              <Text
                style={[
                  styles.taskText,
                  item.completed && styles.taskCompleted,
                ]}
              >
                {item.name}
              </Text>
              {item.address && (
                <Text style={[
                  styles.locationText,
                  item.completed && styles.taskCompleted
                ]}>
                  Location: {getTaskLocation(item.id)}
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => openLocMenu(item.id)}>
                <Image source={require('@/assets/images/compass-alt.png')} style={styles.locationButton} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.homeRowContainer}>
        <Text style={styles.homeHeader}>Completed Tasks</Text>
        <TouchableOpacity style={styles.addTaskButton} onPress={clearCompletedTasks}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tasks ? tasks.filter((item) => item.completed) : tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskContainer}>
            <TouchableOpacity onPress={() => openDescMenu(item.id)}>
              <Text
                style={[
                  styles.taskText,
                  item.completed && styles.taskCompleted,
                ]}
              >
                {item.name}
              </Text>
              {item.location && (
                <Text style={[
                  styles.locationText,
                  item.completed && styles.taskCompleted
                ]}>
                  Location: {getTaskLocation(item.id)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Description Modal */}
      <Modal visible={descMenuVisible} animationType="slide">
          <TouchableOpacity style={styles.menuNav} onPress={() => setDescMenuVisible(false)}>
            <Image source={require('@/assets/images/angle-left.png')} style={styles.locationButton} />
            <Text style={styles.backButtonText}>Home</Text>
          </TouchableOpacity>
        <View style={styles.fullScreenMenu}>
          <Text style={styles.cardMenuTitle}>{taskBeingEdited && getTaskName(taskBeingEdited)}</Text>
          <Text style={styles.cardMenuText}>Location: {getTaskLocation(taskBeingEdited || '')}</Text>
          <TextInput
            style={styles.descInput}
            placeholder="Add description"
            value={taskBeingEdited && tasks.find((item) => item.id === taskBeingEdited)?.description || ''}
            onChangeText={setDesc}
            multiline
          />
          {showCheckMark && (
            <Image source={require('@/assets/images/check-mark.png')} style={styles.checkMark} />
          )}
          <View style={styles.descActions}>
            <TouchableOpacity style={styles.deleteButton} onPress={() => taskBeingEdited && deleteTask(taskBeingEdited)}>
              <Text>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={() => taskBeingEdited && completeTask(taskBeingEdited)}>
              <Text>{taskBeingEdited && getTaskCompelted(taskBeingEdited) ? 'Undo' : 'Complete'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.completeButton} onPress={(saveDescription)}>
                <Text>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Location Selection Modal */}
      <Modal visible={locMenuVisible} transparent={true} animationType="slide">
        <View style={styles.cardMenu}>
          <Text style={styles.cardMenuTitle}>Select Location</Text>
          <TouchableOpacity style={styles.cardMenuButton} onPress={() => { setSelectedLocation(userLocation); saveLocation(); }}>
            <Text style={styles.cardMenuText}>Current Location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardMenuButton} onPress={() => openFavoriteModal()}>
            <Text style={styles.cardMenuText}>Favorite Locations</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardMenuButton} onPress={() => openMap()}>
            <Text style={styles.cardMenuText}>Open Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={() => setLocMenuVisible(false)}>
            <Text style={styles.saveButtonText}>❌</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Favorite Locations Modal */}
      <Modal visible={favoritesListVisible} animationType="slide" transparent>
        <View style={styles.favoriteModal}>
          <Text style={styles.cardMenuTitle}>Favorite Locations</Text>
          <ScrollView style={styles.favoriteList}>
            {favoriteLocations.map((favorite, index) => (
              <TouchableOpacity
                key={index}
                style={styles.favoriteItem}
                onPress={() => handleFavoriteSelect(favorite.location, favorite.address)}
              >
                <Text style={styles.favoriteItemText}>
                  {index + 1}. {favorite.name} - ({favorite.address})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setFavoritesListVisible(false)}
          >
            <Text style={styles.cancelButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Map Modal */}
      <Modal visible={mapVisible} animationType="slide">
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            onPress={handleLocationSelect}
            initialRegion={{
              latitude: userLocation?.latitude || 37.78825,
              longitude: userLocation?.longitude || -122.4324,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            {userLocation && (
              <Marker
                coordinate={userLocation}
                pinColor="blue"
                title="Your Location"
              />
            )}
            {selectedLocation && (
              <Marker coordinate={selectedLocation} />
            )}
          </MapView>
          <View style={styles.mapActions}>
            <TouchableOpacity style={styles.saveButton} onPress={saveLocation}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setMapVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  menuNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: Colors.standard.Beige,
  },
  fullScreenMenu: {
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: Colors.standard.Beige,
  },
  descInput: {
    width: '90%',
    height: 'auto',
    maxHeight: 500,
    borderColor: Colors.standard.Jet,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: Colors.standard.Beige,
    wordWrap: 'break-word',
  },
  cardMenu: {
    marginTop: 200,
    margin: 40,
    backgroundColor: Colors.standard.Beige,
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  cardMenuTitle: {
    fontSize: 20,
    marginBottom: 20,
    color: Colors.standard.Jet,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  cardMenuButton: {
    backgroundColor: Colors.standard.LightBlue,
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  cardMenuText: {
    color: Colors.standard.Jet,
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.standard.Jet,
    padding: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40
  },
  input: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 30,
    padding: 10,
    marginRight: 10,
    backgroundColor: '#fff',
  },
  addTaskButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  addTaskImage: {
    width: 40,
    height: 40,
  },
  taskContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.standard.Beige,
    borderRadius: 5,
    marginBottom: 10,
    borderColor: '#eee',
  },
  taskText: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
    maxWidth: 200,
  },
  taskCompleted: {
    textDecorationLine: 'line-through',
    color: '#aaa',
  },
  taskActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationButton: {
    color: '#007BFF',
    marginRight: 15,
    width: 25,
    height: 25,
  },
  locationText: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
    maxWidth: 200,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  completeButton: {
    backgroundColor: Colors.standard.LightBlue,
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    marginLeft: 50,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapActions: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    padding: 10,
  },
  descActions: {
    flexDirection: 'row',
    margin: 20,
  },
  saveButton: {
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#ff4444',
    padding: 10,
    borderRadius: 5,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteList: {
    height: '70%',
    width: '100%',
    marginTop: 10,
  },
  favoriteItem: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  favoriteModal: {
    margin: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  favoriteItemText: {
    fontSize: 16,
    color: '#555',
  },
  backButtonText: {
    color: Colors.standard.Jet,
    marginRight: 325,
    fontSize: 16,
    fontWeight: 'bold',
  },
  homeHeader: {
    fontSize: 20,
    color: Colors.standard.Beige,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  homeRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clearButtonText: {
    color: Colors.standard.LightBlue,
    marginRight: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkMark: {
    width: 20,
    height: 20,
    marginLeft: 10,
  },
});

export default TaskMap;