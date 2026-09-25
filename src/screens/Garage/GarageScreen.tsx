import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Q } from '@nozbe/watermelondb';
import { darkTheme } from '../../theme/tokens';
import { useActiveCar } from '../../context/ActiveCarContext';
import { database } from '../../db';
import {
  carsCollection,
  serviceRecordsCollection,
  expensesCollection,
  remindersCollection,
} from '../../db/queries';
import { signOut, getGarageId } from '../../services/firebase';
import { syncWithFirestore } from '../../db/sync';
import PrimaryButton from '../../components/PrimaryButton';
import { CarIcon, PlusIcon, ChevronRightIcon } from '../../components/icons';
import type Car from '../../db/models/Car';

interface NewCarForm {
  make: string;
  model: string;
  year: string;
  plateNumber: string;
  mileage: string;
}

const EMPTY_FORM: NewCarForm = { make: '', model: '', year: '', plateNumber: '', mileage: '' };

export default function GarageScreen() {
  const { cars, activeCarId, setActiveCarId } = useActiveCar();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<NewCarForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewCarForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  function openForm() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormOpen(true);
  }

  function confirmDeleteCar(car: Car) {
    Alert.alert(
      `Удалить ${car.make} ${car.model}?`,
      'Вся история ТО и расходов по этому автомобилю тоже будет удалена. Это действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await database.write(async () => {
              const [records, expenseRows, reminderRows] = await Promise.all([
                serviceRecordsCollection.query(Q.where('car_id', car.id)).fetch(),
                expensesCollection.query(Q.where('car_id', car.id)).fetch(),
                remindersCollection.query(Q.where('car_id', car.id)).fetch(),
              ]);
              await Promise.all([
                ...records.map((r) => r.markAsDeleted()),
                ...expenseRows.map((e) => e.markAsDeleted()),
                ...reminderRows.map((r) => r.markAsDeleted()),
                car.markAsDeleted(),
              ]);
            });
            syncWithFirestore();
          },
        },
      ],
    );
  }

  function validate(): boolean {
    const errors: typeof formErrors = {};
    if (!form.make.trim()) errors.make = 'Укажите марку';
    if (!form.model.trim()) errors.model = 'Укажите модель';
    const yearNum = parseInt(form.year, 10);
    if (!form.year || Number.isNaN(yearNum) || yearNum < 1950 || yearNum > new Date().getFullYear() + 1) {
      errors.year = 'Некорректный год';
    }
    const mileageNum = parseInt(form.mileage.replace(/\D/g, ''), 10);
    if (form.mileage && Number.isNaN(mileageNum)) errors.mileage = 'Только цифры';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function saveCar() {
    if (!validate()) return;
    setSaving(true);
    try {
      const garageId = getGarageId() ?? 'local';
      const mileageNum = parseInt(form.mileage.replace(/\D/g, ''), 10) || 0;
      const yearNum = parseInt(form.year, 10);

      let createdId = '';
      await database.write(async () => {
        const record = await carsCollection.create((c) => {
          c.garageId = garageId;
          c.make = form.make.trim();
          c.model = form.model.trim();
          c.year = yearNum;
          c.plateNumber = form.plateNumber.trim() || undefined;
          c.currentMileage = mileageNum;
          c.createdAt = new Date();
          c.updatedAt = new Date();
        });
        createdId = record.id;
      });

      setActiveCarId(createdId);
      setFormOpen(false);
      syncWithFirestore();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Гараж</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cars */}
        <View>
          <Text style={styles.sectionLabel}>МОИ АВТОМОБИЛИ</Text>
          <Text style={styles.sectionHint}>Долгое нажатие на карточку — удалить автомобиль</Text>
          <View style={{ gap: 10 }}>
            {cars.map((car) => {
              const active = car.id === activeCarId;
              return (
                <TouchableOpacity
                  key={car.id}
                  style={[styles.carCard, active && { borderColor: darkTheme.accent }]}
                  onPress={() => setActiveCarId(car.id)}
                  onLongPress={() => confirmDeleteCar(car)}
                  delayLongPress={400}>
                  <View style={styles.carThumb}>
                    <CarIcon size={26} color={darkTheme.textSecondary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.carName}>
                      {car.make} {car.model}
                    </Text>
                    <Text style={styles.carMeta}>
                      {car.currentMileage.toLocaleString('ru-RU')} км
                      {car.plateNumber ? ` · ${car.plateNumber}` : ''}
                    </Text>
                  </View>
                  {active ? (
                    <Text style={styles.activeBadge}>активна</Text>
                  ) : (
                    <ChevronRightIcon size={16} color={darkTheme.textDisabled} />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity style={styles.addCarButton} onPress={openForm}>
              <PlusIcon size={16} color={darkTheme.textSecondary} />
              <Text style={styles.addCarText}>Добавить автомобиль</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Settings */}
        <View>
          <Text style={styles.sectionLabel}>НАСТРОЙКИ</Text>
          <View style={styles.settingsCard}>
            <TouchableOpacity
              style={styles.settingsRow}
              onPress={() => setBiometricEnabled((v) => !v)}>
              <Text style={styles.settingsLabel}>Вход по биометрии</Text>
              <View style={[styles.toggle, biometricEnabled && { backgroundColor: darkTheme.accent }]}>
                <View style={[styles.toggleKnob, biometricEnabled && { alignSelf: 'flex-end' }]} />
              </View>
            </TouchableOpacity>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>Язык</Text>
              <Text style={styles.settingsValue}>Русский</Text>
            </View>

            <View style={styles.settingsDivider} />

            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>Единицы измерения</Text>
              <Text style={styles.settingsValue}>км, л, ₽</Text>
            </View>
          </View>
        </View>

        <PrimaryButton title="Выйти из аккаунта" variant="secondary" onPress={() => signOut()} />
      </ScrollView>

      {/* Add car modal */}
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.formSheet}
            contentContainerStyle={{ paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled">
            <Text style={styles.formTitle}>Новый автомобиль</Text>

            <Field label="Марка" value={form.make} onChangeText={(v) => setForm((f) => ({ ...f, make: v }))} error={formErrors.make} placeholder="Toyota" />
            <Field label="Модель" value={form.model} onChangeText={(v) => setForm((f) => ({ ...f, model: v }))} error={formErrors.model} placeholder="Camry" />
            <Field
              label="Год выпуска"
              value={form.year}
              onChangeText={(v) => setForm((f) => ({ ...f, year: v.replace(/\D/g, '') }))}
              error={formErrors.year}
              placeholder="2021"
              keyboardType="number-pad"
            />
            <Field
              label="Гос. номер (необязательно)"
              value={form.plateNumber}
              onChangeText={(v) => setForm((f) => ({ ...f, plateNumber: v }))}
              placeholder="А 123 БВ 777"
              autoCapitalize="characters"
            />
            <Field
              label="Текущий пробег"
              value={form.mileage}
              onChangeText={(v) => setForm((f) => ({ ...f, mileage: v.replace(/\D/g, '') }))}
              error={formErrors.mileage}
              placeholder="0"
              keyboardType="number-pad"
            />

            <View style={styles.formButtonsRow}>
              <PrimaryButton title="Отмена" variant="secondary" onPress={() => setFormOpen(false)} style={{ flex: 1 }} />
              <PrimaryButton title="Добавить" onPress={saveCar} loading={saving} style={{ flex: 1 }} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad';
  autoCapitalize?: 'none' | 'characters' | 'words' | 'sentences';
}

function Field({ label, value, onChangeText, error, placeholder, keyboardType, autoCapitalize }: FieldProps) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={darkTheme.textDisabled}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.fieldInput, error ? { borderColor: darkTheme.danger } : null]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: darkTheme.background },
  header: { paddingTop: 22, paddingHorizontal: 20, paddingBottom: 4 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: darkTheme.textPrimary },
  content: { padding: 20, paddingTop: 14, gap: 22, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: darkTheme.textDisabled,
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: darkTheme.textDisabled,
    marginTop: -4,
    marginBottom: 10,
  },
  carCard: {
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  carThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: darkTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carName: { fontSize: 15, fontWeight: '700', color: darkTheme.textPrimary },
  carMeta: { fontSize: 12, color: darkTheme.textSecondary, marginTop: 2 },
  activeBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: darkTheme.accent,
    backgroundColor: darkTheme.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    textTransform: 'uppercase',
  },
  addCarButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: darkTheme.border,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addCarText: { fontSize: 14, fontWeight: '600', color: darkTheme.textSecondary },
  settingsCard: {
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.border,
    borderRadius: 16,
    paddingHorizontal: 14,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingsDivider: { height: 1, backgroundColor: darkTheme.border },
  settingsLabel: { fontSize: 14, fontWeight: '600', color: darkTheme.textPrimary },
  settingsValue: { fontSize: 13, color: darkTheme.textSecondary },
  toggle: {
    width: 38,
    height: 22,
    borderRadius: 11,
    backgroundColor: darkTheme.border,
    padding: 2,
    justifyContent: 'center',
  },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  formSheet: {
    backgroundColor: darkTheme.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: darkTheme.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: darkTheme.textSecondary, marginBottom: 6 },
  fieldInput: {
    height: 50,
    borderRadius: 12,
    backgroundColor: darkTheme.surface,
    borderWidth: 1,
    borderColor: darkTheme.border,
    color: darkTheme.textPrimary,
    fontSize: 15,
    paddingHorizontal: 14,
  },
  fieldError: { fontSize: 12, color: darkTheme.danger, marginTop: 6 },
  formButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
