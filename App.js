import React, { useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  PanResponder,
  Dimensions,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Polyline, G } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');
const PLAN_WIDTH = 360;
const PLAN_HEIGHT = 240;

const MATERIALS = {
  standard: { label: 'Standard', color: '#7ee081', multiplier: 1 },
  premium: { label: 'Premium', color: '#f7c66b', multiplier: 1.35 },
  luxury: { label: 'Luxe', color: '#d8a8ff', multiplier: 1.75 },
};

const ROOM_PALETTE = ['#8ecae6', '#bde0fe', '#a2d2ff', '#90e0ef', '#f7d6e0', '#d4f1f4', '#cfe1b9'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getEstimatedCost = (surface, bedrooms, floors, material) => {
  const base = surface * (220 + bedrooms * 35) * floors;
  return Math.round(base * MATERIALS[material].multiplier);
};

const generatePlan = (surface, bedrooms, floors) => {
  const totalRooms = Math.max(4, bedrooms + 3);
  const livingArea = Math.max(22, surface * 0.28);
  const kitchenArea = Math.max(12, surface * 0.14);
  const bathArea = Math.max(8, surface * 0.1);
  const hallArea = Math.max(7, surface * 0.07);

  const roomAreas = [];
  roomAreas.push({ name: 'Salon', area: livingArea });
  roomAreas.push({ name: 'Cuisine', area: kitchenArea });
  roomAreas.push({ name: 'Salle de bain', area: bathArea });
  roomAreas.push({ name: 'Entrée', area: hallArea });

  for (let i = 0; i < bedrooms; i += 1) {
    roomAreas.push({
      name: `Chambre ${i + 1}`,
      area: Math.max(12, surface / (bedrooms + 2) + (i % 2 === 0 ? 7 : 3)),
    });
  }

  const remaining = Math.max(0, surface - roomAreas.reduce((sum, room) => sum + room.area, 0));
  if (remaining > 0) {
    roomAreas.push({ name: 'Suite / bureau', area: remaining * 0.5 });
    roomAreas.push({ name: 'Dépendance', area: remaining * 0.5 });
  }

  const scale = 100 / Math.max(1, roomAreas.reduce((sum, room) => sum + room.area, 0));

  const rects = [];
  let x = 6;
  let y = 8;
  let currentRow = 0;

  roomAreas.forEach((room, index) => {
    const width = clamp((room.area * scale) * 2.2, 16, 38);
    const height = clamp((room.area * scale) * 1.7, 16, 34);

    if (x + width > 80) {
      x = 6;
      y += 28;
      currentRow += 1;
    }

    const rect = {
      ...room,
      x,
      y,
      width,
      height,
      fill: ROOM_PALETTE[index % ROOM_PALETTE.length],
    };

    rects.push(rect);
    x += width + 6;
  });

  return {
    title: `${floors} étage${floors > 1 ? 's' : ''}`,
    rooms: rects.map((room) => ({
      ...room,
      area: Math.round(room.area),
      x: room.x,
      y: room.y,
      width: room.width,
      height: room.height,
    })),
  };
};

export default function App() {
  const [surface, setSurface] = useState('120');
  const [bedrooms, setBedrooms] = useState('3');
  const [floors, setFloors] = useState(1);
  const [material, setMaterial] = useState('premium');
  const [plan, setPlan] = useState(() =>
    generatePlan(120, 3, 1),
  );
  const [showSketch, setShowSketch] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);

  const planData = useMemo(() => {
    const totalSurface = Number(surface) || 120;
    const bedroomCount = Number(bedrooms) || 1;
    return generatePlan(totalSurface, bedroomCount, floors);
  }, [surface, bedrooms, floors]);

  const estimatedCost = useMemo(
    () => getEstimatedCost(Number(surface) || 120, Number(bedrooms) || 1, floors, material),
    [surface, bedrooms, floors, material],
  );

  const onGenerate = () => setPlan(planData);

  const sketchPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentStroke([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (event) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentStroke((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        if (currentStroke.length > 0) {
          setStrokes((prev) => [...prev, currentStroke]);
        }
        setCurrentStroke([]);
      },
    }),
  ).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerBox}>
          <Text style={styles.title}>Maison Plan</Text>
          <Text style={styles.subtitle}>Générateur intelligent de plans</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Surface (m²)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={surface}
            onChangeText={setSurface}
            placeholder="120"
          />

          <Text style={styles.label}>Nombre de chambres</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={bedrooms}
            onChangeText={setBedrooms}
            placeholder="3"
          />

          <Text style={styles.label}>Nombre d'étages</Text>
          <View style={styles.row}>
            {[1, 2, 3].map((item) => (
              <Pressable
                key={item}
                onPress={() => setFloors(item)}
                style={[styles.toggle, floors === item && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, floors === item && styles.toggleTextActive]}>{item}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Matériaux</Text>
          <View style={styles.rowWrap}>
            {Object.entries(MATERIALS).map(([key, value]) => (
              <Pressable
                key={key}
                onPress={() => setMaterial(key)}
                style={[styles.materialButton, material === key && styles.materialButtonActive]}
              >
                <Text style={styles.materialText}>{value.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.primaryButton} onPress={onGenerate}>
            <Text style={styles.primaryButtonText}>Générer le plan</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Résumé</Text>
          <Text style={styles.summaryText}>Surface : {surface || '120'} m²</Text>
          <Text style={styles.summaryText}>Chambres : {bedrooms || '3'}</Text>
          <Text style={styles.summaryText}>Étages : {floors}</Text>
          <Text style={styles.summaryText}>Matériel : {MATERIALS[material].label}</Text>
          <Text style={styles.summaryText}>Coût estimé : {estimatedCost.toLocaleString()} €</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan détaillé</Text>
            <Pressable onPress={() => setShowSketch((v) => !v)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{showSketch ? 'Fermer croquis' : 'Ajouter croquis'}</Text>
            </Pressable>
          </View>

          <View style={styles.planWrapper}>
            <Svg width={PLAN_WIDTH} height={PLAN_HEIGHT} viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}>
              {plan.rooms.map((room, index) => (
                <G key={`${room.name}-${index}`}>
                  <Rect
                    x={room.x * 3.2}
                    y={room.y * 2.4}
                    width={room.width * 3.2}
                    height={room.height * 2.4}
                    rx={8}
                    fill={room.fill}
                    stroke="#1d3557"
                    strokeWidth={1.5}
                  />
                  <SvgText
                    x={room.x * 3.2 + 8}
                    y={room.y * 2.4 + 18}
                    fill="#112033"
                    fontSize="11"
                    fontWeight="700"
                  >
                    {room.name}
                  </SvgText>
                  <SvgText
                    x={room.x * 3.2 + 8}
                    y={room.y * 2.4 + 30}
                    fill="#112033"
                    fontSize="9"
                  >
                    {room.area} m²
                  </SvgText>
                </G>
              ))}

              {showSketch && (
                <>
                  {strokes.map((stroke, strokeIndex) => (
                    <Polyline
                      key={strokeIndex}
                      points={stroke.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke="#0d1b2a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentStroke.length > 1 && (
                    <Polyline
                      points={currentStroke.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke="#0d1b2a"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </>
              )}
            </Svg>
          </View>

          {showSketch && (
            <View
              {...sketchPanResponder.panHandlers}
              style={styles.sketchBoard}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07111f',
  },
  container: {
    padding: 18,
    paddingBottom: 50,
  },
  headerBox: {
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#f7f9fc',
  },
  subtitle: {
    color: '#c5d1e8',
    fontSize: 15,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#101a2d',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    color: '#edf4ff',
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f4f6fb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  toggle: {
    flex: 1,
    backgroundColor: '#1d2c46',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  toggleActive: {
    backgroundColor: '#6ee7b7',
  },
  toggleText: {
    color: '#f4f7ff',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#0d1b2a',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  materialButton: {
    backgroundColor: '#1d2c46',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  materialButtonActive: {
    backgroundColor: '#8ecae6',
  },
  materialText: {
    color: '#ebf2ff',
    fontWeight: '700',
  },
  primaryButton: {
    backgroundColor: '#7ee081',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryButtonText: {
    color: '#0c1420',
    fontSize: 16,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#12243f',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  summaryTitle: {
    color: '#f8fbff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  summaryText: {
    color: '#dfeaff',
    fontSize: 15,
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#eef6ff',
    fontSize: 18,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#1d2c46',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  secondaryButtonText: {
    color: '#f7fafc',
    fontSize: 12,
    fontWeight: '700',
  },
  planWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf4ff',
    borderRadius: 14,
    padding: 10,
    overflow: 'hidden',
  },
  sketchBoard: {
    height: 130,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#cad5e2',
  },
});
