'use client';

import React from 'react';

const SERVICE_TYPES = {
  VIDEO_CONSULT: 'video-consult',
  BRAND_CONSULT: 'brand-consult',
  HOURLY_SESSION: 'hourly-session',
  MIXING_MASTERING: 'mixing-mastering',
  FULL_PRODUCTION: 'full-production'
} as const;

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

interface ServiceSelectorProps {
  selectedService: string | null;
  onServiceSelect: (service: string) => void;
  isNewCustomer: boolean;
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  songCount: number;
  onSongCountChange: (count: number) => void;
  selectedBeatLicense: string | null;
  onBeatLicenseSelect: (license: string | null) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  selectedService,
  onServiceSelect,
  isNewCustomer,
  selectedDuration,
  onDurationChange,
  songCount,
  onSongCountChange,
  selectedBeatLicense,
  onBeatLicenseSelect,
}) => {
  const services = [
    {
      id: SERVICE_TYPES.VIDEO_CONSULT,
      title: '15-Min Free Video Consultation',
      description: 'Free video consultation to discuss your project and goals.',
      icon: '🎥',
      price: 'FREE',
      duration: '15 minutes',
      popular: isNewCustomer
    },
    {
      id: SERVICE_TYPES.BRAND_CONSULT,
      title: '15-Min Free Brand Consultation',
      description: 'Free consultation to discuss your brand and marketing strategy.',
      icon: '💡',
      price: 'FREE',
      duration: '15 minutes'
    },
    {
      id: SERVICE_TYPES.HOURLY_SESSION,
      title: 'Hourly Studio Session',
      description: 'Book studio time for recording, production, or any other needs.',
      icon: '🎵',
      price: '$50-$255',
      duration: '1-6 hours'
    },
    {
      id: SERVICE_TYPES.MIXING_MASTERING,
      title: 'Mixing & Mastering',
      description: 'Professional mixing and mastering services. Includes a 15-minute consultation.',
      icon: '🎚️',
      price: '$130/song',
      duration: '15-min consultation'
    },
    {
      id: SERVICE_TYPES.FULL_PRODUCTION,
      title: 'Full Production Session',
      description: 'Complete production service with optional beat licensing.',
      icon: '🎹',
      price: '$45/hour',
      duration: 'Variable'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Service Cards */}
      <div className="grid gap-4">
        {services.map((service) => (
          <div
            key={service.id}
            onClick={() => onServiceSelect(service.id)}
            className={`relative cursor-pointer p-4 rounded-lg border-2 transition-all ${
              selectedService === service.id
                ? 'border-accent-blue bg-accent-blue/10'
                : 'border-gray-200 bg-white hover:border-accent-blue/50'
            }`}
          >
            {service.popular && (
              <div className="absolute -top-2 left-4 bg-accent-green text-white px-2 py-1 text-xs rounded-full">
                Recommended for New Customers
              </div>
            )}
            <div className="flex items-start space-x-3">
              <div className="text-2xl">{service.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{service.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-medium text-accent-blue">{service.price}</span>
                  <span className="text-xs text-gray-500">{service.duration}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Service-Specific Options */}
      {selectedService === SERVICE_TYPES.HOURLY_SESSION && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Select Duration</h4>
          <div className="grid grid-cols-2 gap-2">
            {HOURLY_PRICING.map((option) => (
              <button
                key={option.hours}
                onClick={() => onDurationChange(option.hours * 60)}
                className={`p-3 rounded border text-center ${
                  selectedDuration === option.hours * 60
                    ? 'border-accent-blue bg-accent-blue text-white'
                    : 'border-gray-200 bg-white hover:border-accent-blue'
                }`}
              >
                <div className="font-medium">{option.hours} hour{option.hours > 1 ? 's' : ''}</div>
                <div className="text-sm">${option.price}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedService === SERVICE_TYPES.MIXING_MASTERING && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Number of Songs</h4>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onSongCountChange(Math.max(1, songCount - 1))}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
            >
              -
            </button>
            <span className="text-lg font-medium w-8 text-center">{songCount}</span>
            <button
              onClick={() => onSongCountChange(songCount + 1)}
              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100"
            >
              +
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Total: ${130 * songCount}
          </div>
        </div>
      )}

      {selectedService === SERVICE_TYPES.FULL_PRODUCTION && (
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Select Duration</h4>
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4, 5, 6].map((hours) => (
                <button
                  key={hours}
                  onClick={() => onDurationChange(hours * 60)}
                  className={`p-3 rounded border text-center ${
                    selectedDuration === hours * 60
                      ? 'border-accent-blue bg-accent-blue text-white'
                      : 'border-gray-200 bg-white hover:border-accent-blue'
                  }`}
                >
                  <div className="font-medium">{hours} hour{hours > 1 ? 's' : ''}</div>
                  <div className="text-sm">${45 * hours}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Beat License (Optional)</h4>
            <div className="space-y-2">
              <button
                onClick={() => onBeatLicenseSelect(null)}
                className={`w-full p-3 rounded border text-left ${
                  !selectedBeatLicense
                    ? 'border-accent-blue bg-accent-blue text-white'
                    : 'border-gray-200 bg-white hover:border-accent-blue'
                }`}
              >
                No Beat License
              </button>
              {Object.values(BEAT_LICENSE_OPTIONS).map((license) => (
                <button
                  key={license.id}
                  onClick={() => onBeatLicenseSelect(license.id)}
                  className={`w-full p-3 rounded border text-left ${
                    selectedBeatLicense === license.id
                      ? 'border-accent-blue bg-accent-blue text-white'
                      : 'border-gray-200 bg-white hover:border-accent-blue'
                  }`}
                >
                  <div className="font-medium">{license.label}</div>
                  <div className="text-sm opacity-75">${license.price}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceSelector;