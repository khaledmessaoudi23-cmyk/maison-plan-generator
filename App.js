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
} from 'react-native';
import Svg, { Rect, Text as SvgText, Polyline, G, Line } from 'react-native-svg';
import { StatusBar } from 'expo-status-bar';

const PLAN_WIDTH = 340;
const PLAN_HEIGHT = 240;

const MATERIALS = {
  standard: { label: 'Standard', multiplier: 1, accent: '#7ee081' },
  premium: { label: 'Premium', multiplier: 1.35, accent: '#f6c453' },
  luxury: { label: 'Luxe', multiplier: 1.75, accent: '#d8a8ff' },
};

const STYLES = {
  scandinave: { label: 'Scandinave', accent: '#bfe7ff' },
  moderne: { label: 'Moderne', accent: '#c9f7d5' },
  classique: { label: 'Classique', accent: '#f9d7b3' },
  luxe: { label: 'Luxe', accent: '#e6d2ff' },
};

const ROOM_PALETTE = ['#8ecae6', '#bde0fe', '#a2d2ff', '#90e0ef', '#f7d6e0', '#d4f1f4', '#cfe1b9'];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getEstimatedCost = (surface, bedrooms, floors, material) => {
  const base = surface * (220 + bedrooms * 35) * floors;
  return Math.round(base * MATERIALS[material].multiplier);
};

const buildDoorsAndWindows = (room, index) => {
  const doorX = room.x + room.width * 0.15;
  const doorY = room.y + room.height - 8;

  const doors = [
    {
      x1: doorX,
      y1: doorY,
      x2: doorX + 18,
      y2: doorY,
      type: 'door',
    },
  ];

  const windows = [
    {
      x1: room.x + 8,
      y1: room.y + 6,
      x2: room.x + room.width - 8,
      y2: room.y + 6,
      type: 'window',
    },
    {
      x1: room.x + room.width - 6,
      y1: room.y + 18,
      x2: room.x + room.width - 6,
      y2: room.y + room.height - 18,
      type: 'window',
    },
  ];

  if (index % 2 === 0) {
    doors.push({
      x1: room.x + room.width - 20,
      y1: room.y + 10,
      x2: room.x + room.width - 2,
      y2: room.y + 10,
      type: 'door',
    });
  }

  return { doors, windows };
};

const generatePlan = (surface, bedrooms, floors) => {
  const rooms = [];
  const requiredRooms = [
    { name: 'Salon', area: Math.max(22, surface * 0.28) },
    { name: 'Cuisine', area: Math.max(12, surface * 0.14) },
    { name: 'Salle de bain', area: Math.max(8, surface * 0.1) },
    { name: 'Entrée', area: Math.max(7, surface * 0.08) },
  ];

  requiredRooms.forEach((room) => rooms.push(room));

  for (let i = 0; i < bedrooms; i += 1) {
    rooms.push({
      name: `Chambre ${i + 1}`,
      area: Math.max(12, surface / Math.max(1, bedrooms + 2) + (i % 2 === 0 ? 5 : 2)),
    });
  }

  const totalUsed = rooms.reduce((sum, room) => sum + room.area, 0);
  const remaining = Math.max(0, surface - totalUsed);
  if (remaining > 0) {
    rooms.push({ name: 'Bureau', area: remaining * 0.55 });
    rooms.push({ name: 'Dépendance', area: remaining * 0.45 });
  }

  const roomBlocks = [];
  let x = 18;
  let y = 16;

  rooms.forEach((room, index) => {
    const width = clamp((room.area / Math.max(1, surface)) * 180, 36, 96);
    const height = clamp((room.area / Math.max(1, surface)) * 140, 26, 68);

    if (x + width > 280) {
      x = 18;
      y += 72;
    }

    const block = {
      ...room,
      x,
      y,
      width,
      height,
      area: Math.round(room.area),
      fill: ROOM_PALETTE[index % ROOM_PALETTE.length],
    };

    const { doors, windows } = buildDoorsAndWindows(block, index);
    roomBlocks.push({
      ...block,
      doors,
      windows,
    });

    x += width + 18;
  });

  return {
    title: `${floors} étage${floors > 1 ? 's' : ''}`,
    rooms: roomBlocks,
  };
};

export default function App() {
  const [surface, setSurface] = useState('120');
  const [bedrooms, setBedrooms] = useState('3');
  const [floors, setFloors] = useState(1);
  const [material, setMaterial] = useState('premium');
  const [decor, setDecor] = useState('moderne');
  const [showSketch, setShowSketch] = useState(true);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [plan, setPlan] = useState(() => generatePlan(120, 3, 1));

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
          <Text style={styles.title}>Maison Plan Pro</Text>
          <Text style={styles.subtitle}>Conception assistée de plans maison</Text>
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

          <Text style={styles.label}>Étages</Text>
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
                style={[styles.chip, material === key && styles.chipActive, { borderColor: value.accent }]}
              >
                <Text style={styles.chipText}>{value.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Style de décoration</Text>
          <View style={styles.rowWrap}>
            {Object.entries(STYLES).map(([key, value]) => (
              <Pressable
                key={key}
                onPress={() => setDecor(key)}
                style={[styles.chip, decor === key && styles.chipActive, { borderColor: value.accent }]}
              >
                <Text style={styles.chipText}>{value.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.primaryButton} onPress={onGenerate}>
            <Text style={styles.primaryButtonText}>Générer le plan</Text>
          </Pressable>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Récapitulatif</Text>
          <Text style={styles.summaryText}>Surface : {surface || '120'} m²</Text>
          <Text style={styles.summaryText}>Chambres : {bedrooms || '3'}</Text>
          <Text style={styles.summaryText}>Étages : {floors}</Text>
          <Text style={styles.summaryText}>Matériau : {MATERIALS[material].label}</Text>
          <Text style={styles.summaryText}>Style : {STYLES[decor].label}</Text>
          <Text style={styles.summaryText}>Coût estimé : {estimatedCost.toLocaleString()} €</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan détaillé</Text>
            <Pressable onPress={() => setShowSketch((v) => !v)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{showSketch ? 'Masquer croquis' : 'Ajouter croquis'}</Text>
            </Pressable>
          </View>

          <View style={styles.planContainer}>
            <Svg width={PLAN_WIDTH} height={PLAN_HEIGHT} viewBox={`0 0 ${PLAN_WIDTH} ${PLAN_HEIGHT}`}>
              <Rect x={0} y={0} width={PLAN_WIDTH} height={PLAN_HEIGHT} rx={18} fill="#edf4ff" />

              {plan.rooms.map((room, index) => (
                <G key={`${room.name}-${index}`}>
                  <Rect
                    x={room.x}
                    y={room.y}
                    width={room.width}
                    height={room.height}
                    rx={10}
                    fill={room.fill}
                    stroke="#1d3557"
                    strokeWidth={1.5}
                  />

                  {(room.windows || []).map((window, idx) => (
                    <Line
                      key={`win-${idx}`}
                      x1={window.x1}
                      y1={window.y1}
                      x2={window.x2}
                      y2={window.y2}
                      stroke="#4d8fd6"
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                  ))}

                  {(room.doors || []).map((door, idx) => (
                    <Line
                      key={`door-${idx}`}
                      x1={door.x1}
                      y1={door.y1}
                      x2={door.x2}
                      y2={door.y2}
                      stroke="#2b3a55"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  ))}

                  <SvgText
                    x={room.x + 8}
                    y={room.y + 18}
                    fill="#112033"
                    fontSize="10"
                    fontWeight="700"
                  >
                    {room.name}
                  </SvgText>
                  <SvgText
                    x={room.x + 8}
                    y={room.y + 30}
                    fill="#112033"
                    fontSize="9"
                  >
                    {room.area} m²
                  </SvgText>
                </G>
              ))}

              {showSketch && (
                <>
                  {strokes.map((stroke, index) => (
                    <Polyline
                      key={index}
                      points={stroke.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke="#0d1b2a"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ))}
                  {currentStroke.length > 1 && (
                    <Polyline
                      points={currentStroke.map((point) => `${point.x},${point.y}`).join(' ')}
                      fill="none"
                      stroke="#0d1b2a"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}
                </>
              )}
            </Svg>

            {showSketch && (
              <View
                {...sketchPanResponder.panHandlers}
                style={styles.sketchOverlay}
              />
            )}
          </View>
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
    marginBottom: 18,
  },
  title: {
    color: '#f7f9fc',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#c9d8ef',
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
  chip: {
    backgroundColor: '#1d2c46',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#12243f',
    borderColor: '#8ecae6',
  },
  chipText: {
    color: '#edf4ff',
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
  planContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#edf4ff',
    borderRadius: 18,
    padding: 10,
    overflow: 'hidden',
  },
  sketchOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'transparent',
  },
});
