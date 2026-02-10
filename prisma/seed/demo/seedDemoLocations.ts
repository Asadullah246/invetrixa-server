/**
 * Seed Demo Locations
 *
 * Creates warehouse and store locations with addresses.
 */

import {
  PrismaClient,
  LocationType,
  LocationSubType,
  LocationStatus,
} from 'generated/prisma/client';
import { faker } from '@faker-js/faker';
import { DEMO_TENANT_ID, DEMO_LOCATION_IDS, DEMO_USER_IDS } from './constants';

interface DemoLocationData {
  id: string;
  name: string;
  code: string;
  type: LocationType;
  subType: LocationSubType;
  email: string;
  phone: string;
  businessHours: string;
  capacity: number;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    lat?: number;
    lng?: number;
  };
}

export async function seedDemoLocations(prisma: PrismaClient): Promise<void> {
  const locations: DemoLocationData[] = [
    {
      id: DEMO_LOCATION_IDS.MAIN_WAREHOUSE,
      name: 'Main Warehouse',
      code: 'WH-01',
      type: LocationType.WAREHOUSE,
      subType: LocationSubType.PHYSICAL,
      email: 'warehouse@demo.invetrixa.com',
      phone: '+8801700000101',
      businessHours: '8:00 AM - 6:00 PM',
      capacity: 10000,
      address: {
        line1: 'Plot 45, DEPZ',
        line2: 'Savar Export Processing Zone',
        city: 'Savar',
        state: 'Dhaka Division',
        postalCode: '1349',
        country: 'Bangladesh',
        lat: 23.8518,
        lng: 90.2636,
      },
    },
    {
      id: DEMO_LOCATION_IDS.STORE_DHAKA,
      name: 'Store Dhaka - Gulshan',
      code: 'ST-DHK',
      type: LocationType.STORAGE,
      subType: LocationSubType.PHYSICAL,
      email: 'dhaka@demo.invetrixa.com',
      phone: '+8801700000102',
      businessHours: '10:00 AM - 9:00 PM',
      capacity: 500,
      address: {
        line1: 'House 23, Road 11',
        line2: 'Gulshan-2',
        city: 'Dhaka',
        state: 'Dhaka Division',
        postalCode: '1212',
        country: 'Bangladesh',
        lat: 23.7925,
        lng: 90.4078,
      },
    },
    {
      id: DEMO_LOCATION_IDS.STORE_CHITTAGONG,
      name: 'Store Chittagong - GEC',
      code: 'ST-CTG',
      type: LocationType.STORAGE,
      subType: LocationSubType.PHYSICAL,
      email: 'chittagong@demo.invetrixa.com',
      phone: '+8801700000103',
      businessHours: '10:00 AM - 8:00 PM',
      capacity: 300,
      address: {
        line1: 'Building 7, GEC Circle',
        city: 'Chittagong',
        state: 'Chittagong Division',
        postalCode: '4000',
        country: 'Bangladesh',
        lat: 22.3569,
        lng: 91.7832,
      },
    },
  ];

  await prisma.$transaction(async (tx) => {
    for (const loc of locations) {
      // Upsert location
      const location = await tx.location.upsert({
        where: {
          code_tenantId: {
            code: loc.code,
            tenantId: DEMO_TENANT_ID,
          },
        },
        create: {
          id: loc.id,
          name: loc.name,
          code: loc.code,
          type: loc.type,
          subType: loc.subType,
          email: loc.email,
          phone: loc.phone,
          businessHours: loc.businessHours,
          totalCapacity: loc.capacity,
          status: LocationStatus.ACTIVE,
          establishedYear: faker.date.past({ years: 3 }),
          tenantId: DEMO_TENANT_ID,
          createdByUserId: DEMO_USER_IDS.OWNER,
        },
        update: {
          name: loc.name,
          type: loc.type,
          status: LocationStatus.ACTIVE,
        },
      });

      // Upsert address for location
      await tx.address.upsert({
        where: { locationId: location.id },
        create: {
          locationId: location.id,
          addressLine1: loc.address.line1,
          addressLine2: loc.address.line2,
          city: loc.address.city,
          state: loc.address.state,
          postalCode: loc.address.postalCode,
          country: loc.address.country,
          latitude: loc.address.lat,
          longitude: loc.address.lng,
        },
        update: {
          addressLine1: loc.address.line1,
          city: loc.address.city,
        },
      });
    }

    console.log(`   ✅ ${locations.length} locations created`);
    console.log(`      - 1 Main Warehouse (Savar)`);
    console.log(`      - 2 Retail Stores (Dhaka, Chittagong)`);
  });
}
