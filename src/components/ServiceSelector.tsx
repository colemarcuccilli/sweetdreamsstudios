'use client';

import React, { useState, useEffect } from 'react';
import { db as firestore } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

interface Service {
  id: string;
  name: string;
  category: string;
  duration: number;
  price: number;
  isFree: boolean;
  active: boolean;
  description: string;
  serviceType?: string;
  icon?: string;
  // Hourly session fields
  isHourly?: boolean;
  minDuration?: number;
  maxDuration?: number;
  hourlyPricing?: { hours: number; price: number }[];
  // Per-song fields
  pricePerSong?: number;
  // Production fields
  pricePerHour?: number;
  beatLicenseOptions?: any;
}

interface ServiceSelectorProps {
  selectedService: string | null;
  onServiceSelect: (service: string) => void;
  onServiceDataSelect?: (serviceData: Service | null) => void;
  isNewCustomer: boolean;
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  songCount: number;
  onSongCountChange: (count: number) => void;
  selectedBeatLicense: string | null;
  onBeatLicenseSelect: (license: string | null) => void;
}

// Default pricing for backward compatibility
const HOURLY_PRICING = [
  { hours: 1, price: 50 },
  { hours: 2, price: 100 },
  { hours: 3, price: 125 },
  { hours: 4, price: 170 },
  { hours: 5, price: 215 },
  { hours: 6, price: 255 },
];

const BEAT_LICENSE_OPTIONS = {
  BASIC_LEASE: { id: 'basic-lease', label: 'Basic Lease', price: 35 },
  FULL_BUY: { id: 'full-buy', label: 'Full Buy', price: 150 },
  EXCLUSIVE: { id: 'exclusive', label: 'Exclusive Rights', price: 150, includesRevisions: true }
} as const;

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedService,
  onServiceSelect,
  onServiceDataSelect,
  isNewCustomer,
  selectedDuration,
  onDurationChange,
  songCount,
  onSongCountChange,
  selectedBeatLicense,
  onBeatLicenseSelect,
}) => {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      // Fetch only active services
      const servicesQuery = query(
        collection(firestore, 'services'), 
        where('active', '==', true)
      );
      const snapshot = await getDocs(servicesQuery);
      const fetchedServices = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Service));
      
      setServices(fetchedServices);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError('Failed to load services. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const selectedServiceData = services.find(s => s.id === selectedService);

  const getServicePrice = (service: Service) => {
    if (service.isFree) return 'Free';
    
    if (service.isHourly || service.serviceType === 'hourly-session') {
      const pricing = service.hourlyPricing || HOURLY_PRICING;
      const minPrice = Math.min(...pricing.map(p => p.price));
      const maxPrice = Math.max(...pricing.map(p => p.price));
      return `$${minPrice} - $${maxPrice}`;
    }
    
    if (service.pricePerSong) {
      return `$${service.pricePerSong}/song`;
    }
    
    if (service.pricePerHour) {
      return `$${service.pricePerHour}/hour`;
    }
    
    return `$${service.price}`;
  };

  const calculateTotalPrice = () => {
    if (!selectedServiceData) return 0;

    if (selectedServiceData.isFree) return 0;

    if (selectedServiceData.isHourly || selectedServiceData.serviceType === 'hourly-session') {
      const hours = selectedDuration / 60;
      const pricing = selectedServiceData.hourlyPricing || HOURLY_PRICING;
      const pricePoint = pricing.find(p => p.hours === hours);
      return pricePoint ? pricePoint.price : 0;
    }

    if (selectedServiceData.pricePerSong) {
      return selectedServiceData.pricePerSong * songCount;
    }

    if (selectedServiceData.pricePerHour) {
      const hours = selectedDuration / 60;
      let basePrice = selectedServiceData.pricePerHour * hours;
      
      // Add beat license if selected
      if (selectedBeatLicense) {
        const license = Object.values(BEAT_LICENSE_OPTIONS).find(l => l.id === selectedBeatLicense);
        if (license) basePrice += license.price;
      }
      
      return basePrice;
    }

    return selectedServiceData.price;
  };

  if (loading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-logo text-accent-blue mb-4">Select Service</h2>
        <div className="text-center py-8">
          <div className="text-slate-500">Loading services...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-logo text-accent-blue mb-4">Select Service</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-logo text-accent-blue mb-4">Select Service</h2>
        <div className="text-center py-8">
          <div className="text-slate-500">No services available. Please contact support.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-logo text-accent-blue mb-4">Select Service</h2>
      
      {isNewCustomer && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800 text-sm font-medium">
            💡 <strong>New customer?</strong> We recommend starting with a free consultation to discuss your goals and determine the best service for your needs.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => {
              onServiceSelect(service.id);
              onServiceDataSelect?.(service);
            }}
            className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md min-h-[120px] ${
              selectedService === service.id
                ? 'border-accent-blue bg-accent-blue/10 shadow-lg'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center space-x-3 mb-3">
                <div className="text-2xl flex-shrink-0">{service.icon || '🎵'}</div>
                <h3 className="font-semibold text-slate-900 text-base leading-tight">{service.name}</h3>
              </div>
              <p className="text-sm text-slate-600 mb-3 flex-grow leading-relaxed">{service.description}</p>
              <div className="flex items-center justify-between mt-auto">
                <span className="text-lg font-bold text-accent-green">
                  {getServicePrice(service)}
                </span>
                <span className="text-xs text-slate-500 capitalize bg-slate-100 px-2 py-1 rounded">
                  {service.category}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Time Frame Selection for Hourly Services */}
      {selectedServiceData && selectedServiceData.hourlyPricing && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="font-semibold mb-3 text-blue-800">Choose Time Duration</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {selectedServiceData.hourlyPricing.map((option: any, index: number) => (
              <button
                key={index}
                onClick={() => onDurationChange(option.hours * 60)}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                  selectedDuration === option.hours * 60
                    ? 'bg-accent-blue text-white border-accent-blue'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-accent-blue'
                }`}
              >
                <div>{option.hours} hour{option.hours > 1 ? 's' : ''}</div>
                <div className="text-xs opacity-75">${option.price}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Service-specific options */}
      {selectedServiceData && (
        <div className="mt-6 p-4 bg-slate-50 rounded-lg">
          <h3 className="font-semibold mb-3">Service Options</h3>
          
          {/* Hourly Session Duration */}
          {(selectedServiceData.isHourly || selectedServiceData.serviceType === 'hourly-session') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Session Duration
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              >
                {(selectedServiceData.hourlyPricing || HOURLY_PRICING).map((option) => (
                  <option key={option.hours} value={option.hours * 60}>
                    {option.hours} hour{option.hours > 1 ? 's' : ''} - ${option.price}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mixing & Mastering Song Count */}
          {selectedServiceData.pricePerSong && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Number of Songs
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={songCount}
                onChange={(e) => onSongCountChange(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              />
            </div>
          )}

          {/* Production Duration */}
          {selectedServiceData.pricePerHour && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Session Duration (hours)
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => onDurationChange(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-accent-blue focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6].map((hours) => (
                  <option key={hours} value={hours * 60}>
                    {hours} hour{hours > 1 ? 's' : ''} - ${selectedServiceData.pricePerHour! * hours}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Beat License Options */}
          {selectedServiceData.beatLicenseOptions && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Beat License (Optional)
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="beatLicense"
                    value=""
                    checked={!selectedBeatLicense}
                    onChange={() => onBeatLicenseSelect(null)}
                    className="mr-2"
                  />
                  No license needed
                </label>
                {Object.values(BEAT_LICENSE_OPTIONS).map((license) => (
                  <label key={license.id} className="flex items-center">
                    <input
                      type="radio"
                      name="beatLicense"
                      value={license.id}
                      checked={selectedBeatLicense === license.id}
                      onChange={() => onBeatLicenseSelect(license.id)}
                      className="mr-2"
                    />
                    {license.label} - ${license.price}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Price Summary */}
          <div className="pt-3 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total:</span>
              <span className="text-xl font-bold text-accent-green">
                {selectedServiceData.isFree ? 'Free' : `$${calculateTotalPrice()}`}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelector;