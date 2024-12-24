import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '@/constants/Colors';

const MapPage = () => {
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [favoriteModalVisible, setFavoriteModalVisible] = useState(false);
  const [favoritesListVisible, setFavoritesListVisible] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');
  const [favoriteLocations, setFavoriteLocations] = useState<
    { name: string; location: { latitude: number; longitude: number } }[]
  >([]);

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
  }, []);

  // Save favorite locations to AsyncStorage whenever they change
  useEffect(() => {
    const saveFavorites = async () => {
      try {
        await AsyncStorage.setItem(
          'favoriteLocations',
          JSON.stringify(favoriteLocations)
        );
      } catch (error) {
        console.error('Failed to save favorite locations:', error);
      }
    };

    saveFavorites();
  }, [favoriteLocations]);

  useEffect(() => {
    let locationSubscription: { remove: any };

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 0.5,
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

  const handleLocationSelect = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const coordinate = e.nativeEvent.coordinate;
    setSelectedLocation(coordinate);
  };

  const openFavoriteModal = () => {
    if (!selectedLocation) {
      Alert.alert('No location selected', 'Please select a location on the map first.');
      return;
    }
    setFavoriteModalVisible(true);
  };

  const saveFavoriteLocation = () => {
    if (!favoriteName.trim()) {
      Alert.alert('Invalid name', 'Please enter a name for the location.');
      return;
    }

    setFavoriteLocations([
      ...favoriteLocations,
      { name: favoriteName.trim(), location: selectedLocation! },
    ]);

    Alert.alert('Location Saved', `Saved as "${favoriteName.trim()}"`);
    setFavoriteName('');
    setFavoriteModalVisible(false);
  };

  const openFavoritesList = () => {
    setFavoritesListVisible(true);
  };

  const handleDeleteFavorite = (index: number) => {
    Alert.alert(
      'Delete Favorite',
      `Are you sure you want to delete "${favoriteLocations[index].name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedFavorites = [...favoriteLocations];
            updatedFavorites.splice(index, 1);
            setFavoriteLocations(updatedFavorites);
            Alert.alert('Deleted', `"${favoriteLocations[index].name}" has been removed.`);
          },
        },
      ]
    );
  };

  return (
    <>
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
          {selectedLocation && <Marker coordinate={selectedLocation} />}
        </MapView>
        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.saveButton} onPress={openFavoriteModal}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={openFavoritesList}>
            <Text style={styles.saveButtonText}>Favorites</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Modal for saving favorite location */}
      <Modal visible={favoriteModalVisible} animationType="slide" transparent>
        <View style={styles.favoriteModal}>
          <Text style={styles.modalTitle}>Save Location</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter name"
            value={favoriteName}
            onChangeText={setFavoriteName}
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.saveButton} onPress={saveFavoriteLocation}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setFavoriteModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for displaying favorite locations */}
      <Modal visible={favoritesListVisible} animationType="slide" transparent>
        <View style={styles.favoriteModal}>
          <Text style={styles.modalTitle}>Favorite Locations</Text>
          <ScrollView style={styles.favoriteList}>
            {favoriteLocations.map((favorite, index) => (
              <View key={index} style={styles.favoriteItemContainer}>
                <Text style={styles.favoriteItem}>
                  {index + 1}. {favorite.name} - ({favorite.location.latitude.toFixed(4)}, {favorite.location.longitude.toFixed(4)})
                </Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteFavorite(index)}
                >
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
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

    </>
  );
};

const styles = StyleSheet.create({
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
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0)',
    padding: 10,
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
    marginTop: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    color: '#333',
  },
  modalInput: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 5,
    width: '80%',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
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
    maxWidth: 150,
  },
  favoriteItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    padding: 5,
    borderRadius: 5,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
});

export default MapPage;
