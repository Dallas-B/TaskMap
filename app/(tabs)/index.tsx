import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';

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
  text: string;
  completed: boolean;
  location: { latitude: number; longitude: number } | null;
  notified: boolean
};


const TaskMap = () => {
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mapVisible, setMapVisible] = useState(false);
  const [taskBeingEdited, setTaskBeingEdited] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);


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
        body: `Task: ${task.text}`,
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
  const openMap = async (taskId: string) => {
    setTaskBeingEdited(taskId);
    await getCurrentLocation(); // Fetch user's location
    setMapVisible(true);
  };

  // Handle map location selection
  const handleLocationSelect = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coordinate = e.nativeEvent.coordinate;
    setSelectedLocation(coordinate);
  };

  // Save the selected location to the task
  const saveLocation = () => {
    if (taskBeingEdited && selectedLocation) {
      setTasks(
        tasks.map((item) =>
          item.id === taskBeingEdited
            ? { ...item, location: selectedLocation }
            : item
        )
      );
    }
    setMapVisible(false);
    setSelectedLocation(null);
    setTaskBeingEdited(null);
  };

  const addTask = () => {
    if (task.trim()) {
      setTasks([...tasks, { id: Date.now().toString(), text: task, completed: false, location: null, notified: false }]);
      setTask('');
    }
  };

  const toggleTaskCompletion = (id: string) => {
    setTasks(
      tasks.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteTask = (id: string) => {
    setTasks(tasks.filter((item) => item.id !== id));
  };

  if(userLocation && tasks.length > 0){
    checkProximityToTasks({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
    }); 
  }

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
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskContainer}>
            <TouchableOpacity onPress={() => toggleTaskCompletion(item.id)}>
              <Text
                style={[
                  styles.taskText,
                  item.completed && styles.taskCompleted,
                ]}
              >
                {item.text}
              </Text>
              {item.location && (
                <Text style={[
                  styles.locationText,
                  item.completed && styles.taskCompleted
                ]}>
                  Location: {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.taskActions}>
              <TouchableOpacity onPress={() => openMap(item.id)}>
                <Text style={styles.locationButton}>📍</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteTask(item.id)}>
                <Text style={styles.deleteButton}>❌</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

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
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
  },
  addButton: {
    marginLeft: 10,
    backgroundColor: '#007BFF',
    padding: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 5,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  taskText: {
    fontSize: 16,
    color: '#333',
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
    fontSize: 18,
    marginRight: 10,
  },
  locationText: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  deleteButton: {
    fontSize: 16,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
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
});

export default TaskMap;