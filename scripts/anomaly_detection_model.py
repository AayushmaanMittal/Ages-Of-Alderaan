import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import json
import sys
from datetime import datetime

class NetworkAnomalyDetector:
    def __init__(self):
        self.model = IsolationForest(contamination=0.1, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def preprocess_data(self, data):
        """Preprocess network data for ML model"""
        features = []
        for entry in data:
            # Extract numerical features
            feature_vector = [
                entry['packets'],
                entry['bytes'],
                len(entry['source'].split('.')),  # IP complexity
                len(entry['destination'].split('.')),  # IP complexity
                hash(entry['protocol']) % 1000,  # Protocol hash
            ]
            features.append(feature_vector)
        
        return np.array(features)
    
    def train_model(self, training_data):
        """Train the anomaly detection model"""
        features = self.preprocess_data(training_data)
        features_scaled = self.scaler.fit_transform(features)
        self.model.fit(features_scaled)
        self.is_trained = True
        print("Model trained successfully!")
    
    def detect_anomalies(self, data):
        """Detect anomalies in network data"""
        if not self.is_trained:
            print("Model not trained yet!")
            return []
        
        features = self.preprocess_data(data)
        features_scaled = self.scaler.transform(features)
        predictions = self.model.predict(features_scaled)
        anomaly_scores = self.model.decision_function(features_scaled)
        
        results = []
        for i, (prediction, score) in enumerate(zip(predictions, anomaly_scores)):
            if prediction == -1:  # Anomaly detected
                severity = self.get_severity(score)
                results.append({
                    'index': i,
                    'anomaly': True,
                    'severity': severity,
                    'score': float(score),
                    'timestamp': data[i]['timestamp']
                })
        
        return results
    
    def get_severity(self, score):
        """Determine severity based on anomaly score"""
        if score < -0.5:
            return 'high'
        elif score < -0.2:
            return 'medium'
        else:
            return 'low'

def main():
    detector = NetworkAnomalyDetector()
    
    # Sample training data (in real implementation, this would come from historical data)
    training_data = [
        {'packets': 100, 'bytes': 5000, 'source': '192.168.1.1', 'destination': '10.0.0.1', 'protocol': 'TCP'},
        {'packets': 150, 'bytes': 7500, 'source': '192.168.1.2', 'destination': '10.0.0.2', 'protocol': 'UDP'},
        {'packets': 200, 'bytes': 10000, 'source': '192.168.1.3', 'destination': '10.0.0.3', 'protocol': 'HTTP'},
        # Add more training samples...
    ]
    
    # Train the model
    detector.train_model(training_data)
    
    # Example usage with new data
    if len(sys.argv) > 1:
        # Read data from command line argument (JSON string)
        new_data = json.loads(sys.argv[1])
        anomalies = detector.detect_anomalies(new_data)
        print(json.dumps(anomalies))
    else:
        print("No data provided for analysis")

if __name__ == "__main__":
    main()
