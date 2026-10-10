import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  PanResponder,
  Alert,
} from 'react-native';
import Svg, { Rect, Text as SvgText, Polyline, G, Line, Circle } from 'react-native-svg';
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

const buildDoorsAndWindows = (room) => {
  const doors = [];
  const windows = [];

  const doorY = room.y + room.height - 8;
  doors.push({ x1: room.x + 12, y1: doorY, x2: room.x + 28, y2: doorY });

  windows.push({
    x1: room.x + 10,
    y1: room.y + 8,
    x2: room.x + room.width - 10,
    y2: room.y + 8,
  });

  windows.push({
    x1: room.x + room.width - 6,
    y1: room.y + 16,
    x2: room.x + room.width - 6,
    y2: room.y + room.height - 18,
  });

  if (room.name.toLowerCase().includes('cuisine') || room.name.toLowerCase().includes('salon')) {
    windows.push({
      x1: room.x + 12,
      y1: room.y + room.height - 10,
      x2: room.x + room.width - 12,
      y2: room.y + room.height - 10,
    });
  }

  return { doors, windows };
};

const generatePlan = (surface, bedrooms, floors, decorStyle) => {
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
    const width = clamp((room.area / Math.max(1, surface)) * 180, 38, 96);
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
      style: decorStyle,
    };

    const { doors, windows } = buildDoorsAndWindows(block);
    roomBlocks.push({ ...block, doors, windows });

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
  const [floors, setFloors] = useState(2);
  const [material, setMaterial] = useState('premium');
  const [decor, setDecor] = useState('moderne');
  const [showSketch, setShowSketch] = useState(true);
  const [strokes, setStrokes] = useState([]);
  const [currentStroke, setCurrentStroke] = useState([]);
  const [savedProjects, setSavedProjects] = useState([]);
  const [viewMode, setViewMode] = useState('plan');
  const [projectName, setProjectName] = useState('Projet maison 1');
  const [plan, setPlan] = useState(() => generatePlan(120, 3, 2, 'moderne'));

  useEffect(() => {
    const saved = globalThis.localStorage ? JSON.parse(globalThis.localStorage.getItem('housePlans') || '[]') : [];
    setSavedProjects(saved);
  }, []);

  const planData = useMemo(() => {
    const totalSurface = Number(surface) || 120;
    const bedroomCount = Number(bedrooms) || 1;
    return generatePlan(totalSurface, bedroomCount, floors, decor);
  }, [surface, bedrooms, floors, decor]);

  const estimatedCost = useMemo(
    () => getEstimatedCost(Number(surface) || 120, Number(bedrooms) || 1, floors, material),
    [surface, bedrooms, floors, material],
  );

  const onGenerate = () => setPlan(planData);

  const onSave = () => {
    const projects = [
      ...savedProjects,
      {
        id: Date.now(),
        name: projectName || 'Projet maison',
        surface: Number(surface) || 120,
        bedrooms: Number(bedrooms) || 1,
        floors,
        material,
        decor,
        cost: estimatedCost,
      },
    ];

    setSavedProjects(projects);
    if (globalThis.localStorage) {
      globalThis.localStorage.setItem('housePlans', JSON.stringify(projects));
    }

    Alert.alert('Projet enregistré', 'Votre plan a été enregistré dans la mémoire locale.');
  };

  const onExport = () => {
    Alert.alert('Export', 'Le plan peut être exporté ensuite comme image ou PDF dans une version premium.');
  };

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
          <Text style={styles.subtitle}>Logiciel de conception immobilière</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Nom du projet</Text>
          <TextInput
            style={styles.input}
            value={projectName}
            onChangeText={setProjectName}
            placeholder="Maison 1"
          />

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

          <Text style={styles.label}>Vue</Text>
          <View style={styles.row}>
            {['plan', '3d'].map((item) => (
              <Pressable
                key={item}
                onPress={() => setViewMode(item)}
                style={[styles.toggle, viewMode === item && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, viewMode === item && styles.toggleTextActive]}>{item === 'plan' ? 'Plan 2D' : 'Vue 3D'}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.primaryButton} onPress={onGenerate}>
              <Text style={styles.primaryButtonText}>Générer</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onSave}>
              <Text style={styles.secondaryButtonText}>Enregistrer</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={onExport}>
              <Text style={styles.secondaryButtonText}>Exporter</Text>
            </Pressable>
          </View>
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

        {savedProjects.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Projets enregistrés</Text>
            {savedProjects.map((project) => (
              <View key={project.id} style={styles.savedItem}>
                <Text style={styles.savedItemTitle}>{project.name}</Text>
                <Text style={styles.savedItemText}>{project.surface} m² · {project.bedrooms} chambres · {project.floors} étages</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Plan détaillé</Text>
            <Pressable onPress={() => setShowSketch((v) => !v)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>{showSketch ? 'Masquer croquis' : 'Ajouter croquis'}</Text>
            </Pressable>
          </View>

          {viewMode === 'plan' ? (
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

                    <Circle cx={room.x + room.width * 0.72} cy={room.y + room.height * 0.65} r={3} fill="#f8f9fa" stroke="#2b3a55" />

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
          ) : (
            <View style={styles.threeDBox}>
              <Text style={styles.threeDTitle}>Vue 3D</Text>
              <View style={styles.threeDHouse}>
                <View style={styles.threeDFloor} />
                <View style={styles.threeDFloorTwo} />
              </View>
              <Text style={styles.threeDText}>Style : {STYLES[decor].label}</Text>
              <Text style={styles.threeDText}>Matériau : {MATERIALS[material].label}</Text>
            </View>
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#7ee081',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#0c1420',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1d2c46',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#f7fafc',
    fontSize: 14,
    fontWeight: '700',
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
    marginBottom: 8,
  },
  savedItem: {
    backgroundColor: '#183253',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  savedItemTitle: {
    color: '#f3f8ff',
    fontWeight: '700',
  },
  savedItemText: {
    color: '#cfe2ff',
    marginTop: 4,
    fontSize: 12,
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
  threeDBox: {
    backgroundColor: '#edf4ff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeDTitle: {
    color: '#132338',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  threeDHouse: {
    width: 220,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dfeafc',
    borderRadius: 16,
    position: 'relative',
  },
  threeDFloor: {
    width: 160,
    height: 70,
    backgroundColor: '#7aa7d8',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#254466',
    position: 'absolute',
    top: 34,
  },
  threeDFloorTwo: {
    width: 120,
    height: 52,
    backgroundColor: '#a7d4ff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#254466',
    position: 'absolute',
    top: 12,
  },
  threeDText: {
    color: '#132338',
    marginTop: 12,
    fontWeight: '700',
  },
});
