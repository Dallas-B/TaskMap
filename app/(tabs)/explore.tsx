import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MapPage = () => {
  const [mapVisible, setMapVisible] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [favoriteModalVisible, setFavoriteModalVisible] = useState(false);
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

  return (
    <>
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
            {selectedLocation && <Marker coordinate={selectedLocation} />}
          </MapView>
          <View style={styles.mapActions}>
            <TouchableOpacity style={styles.saveButton} onPress={openFavoriteModal}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setMapVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal for saving favorite location */}
      <Modal visible={favoriteModalVisible} animationType="slide" transparent>
        <View style={styles.favoriteModal}>
          <Text style={styles.modalTitle}>Save Location</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Enter a name for the location"
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
    justifyContent: 'space-between',
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
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  favoriteModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
    color: '#fff',
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
});

export default MapPage;
