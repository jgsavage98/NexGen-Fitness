import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import {launchImageLibrary, launchCamera, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {useAuth} from '../context/AuthContext';
import {API_BASE_URL} from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface UploadResult {
  extractedCalories: number;
  extractedProtein: number;
  extractedCarbs: number;
  extractedFat: number;
  visionConfidence: number;
}

export default function CameraScreen() {
  const {user} = useAuth();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('auth_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Cookie': `auth_token=${token}`,
    };
  };

  const showImagePicker = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to add your macro photo',
      [
        {text: 'Camera', onPress: openCamera},
        {text: 'Photo Library', onPress: openImageLibrary},
        {text: 'Cancel', style: 'cancel'},
      ]
    );
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: false,
    };

    launchCamera(options, handleImageResponse);
  };

  const openImageLibrary = () => {
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8,
      includeBase64: false,
    };

    launchImageLibrary(options, handleImageResponse);
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      if (asset.uri) {
        setSelectedImage(asset.uri);
        setUploadResult(null);
      }
    }
  };

  const uploadMacroPhoto = async () => {
    if (!selectedImage) return;

    setUploading(true);
    try {
      const headers = await getAuthHeaders();
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('screenshot', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'macro-photo.jpg',
      } as any);

      const response = await fetch(`${API_BASE_URL}/api/upload-macro-screenshot`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadResult(result);
        Alert.alert(
          'Upload Successful!',
          `Macros extracted with ${Math.round(result.visionConfidence * 100)}% confidence`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedImage(null);
                setUploadResult(null);
              }
            }
          ]
        );
      } else {
        const error = await response.json();
        Alert.alert('Upload Failed', error.message || 'Please try again');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Please check your connection and try again');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Upload Macro Photo</Text>
          <Text style={styles.subtitle}>
            Take a photo of your nutrition label or meal tracking app
          </Text>
        </View>

        {/* Image Selection */}
        {!selectedImage ? (
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={showImagePicker}>
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>Choose Photo</Text>
              <Text style={styles.imagePickerSubtext}>
                Camera or Photo Library
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePreviewContainer}>
            <Image source={{uri: selectedImage}} style={styles.imagePreview} />
            
            <View style={styles.imageActions}>
              <TouchableOpacity 
                style={styles.changePhotoButton} 
                onPress={showImagePicker}
                disabled={uploading}
              >
                <Text style={styles.changePhotoText}>Change Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]} 
                onPress={uploadMacroPhoto}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.uploadButtonText}>Upload & Analyze</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Upload Result */}
        {uploadResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Extracted Macros</Text>
            
            <View style={styles.macroGrid}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{uploadResult.extractedCalories}</Text>
                <Text style={styles.macroLabel}>Calories</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{uploadResult.extractedProtein}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{uploadResult.extractedCarbs}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{uploadResult.extractedFat}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
            
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(uploadResult.visionConfidence * 100)}%
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Tips for Best Results</Text>
          <Text style={styles.instructionItem}>• Take photos in good lighting</Text>
          <Text style={styles.instructionItem}>• Make sure text is clear and readable</Text>
          <Text style={styles.instructionItem}>• Include the full nutrition label</Text>
          <Text style={styles.instructionItem}>• Avoid shadows or glare</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imagePickerButton: {
    backgroundColor: '#ffffff',
    width: 200,
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  imagePickerIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  imagePickerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
  },
  imagePickerSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imagePreview: {
    width: 300,
    height: 300,
    borderRadius: 12,
    marginBottom: 20,
  },
  imageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  changePhotoButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changePhotoText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  uploadButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  uploadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  resultContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  macroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  macroLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  confidenceText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
  instructionsContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  instructionItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
});