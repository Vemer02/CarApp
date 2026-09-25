import { Q } from '@nozbe/watermelondb';
import { database } from './index';
import Car from './models/Car';
import ServiceRecord from './models/ServiceRecord';
import Expense from './models/Expense';
import Reminder from './models/Reminder';

export const carsCollection = database.get<Car>('cars');
export const serviceRecordsCollection = database.get<ServiceRecord>('service_records');
export const expensesCollection = database.get<Expense>('expenses');
export const remindersCollection = database.get<Reminder>('reminders');

export function observeAllCars() {
  return carsCollection.query(Q.sortBy('created_at', Q.asc)).observe();
}

export function observeActiveReminders(carId: string) {
  return remindersCollection
    .query(Q.where('car_id', carId), Q.where('status', 'active'))
    .observe();
}

export function observeRecentServiceRecords(carId: string, limit = 10) {
  return serviceRecordsCollection
    .query(Q.where('car_id', carId), Q.sortBy('date', Q.desc), Q.take(limit))
    .observe();
}

export function observeExpensesBetween(carId: string, fromMs: number, toMs: number) {
  return expensesCollection
    .query(
      Q.where('car_id', carId),
      Q.where('date', Q.gte(fromMs)),
      Q.where('date', Q.lt(toMs)),
      Q.sortBy('date', Q.desc),
    )
    .observe();
}
