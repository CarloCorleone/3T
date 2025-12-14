// Coordenadas aproximadas de los polígonos de las comunas de Santiago
// Formato: [lat, lng] para cada punto del polígono

export const COMUNAS_COORDS: Record<string, { lat: number; lng: number }[]> = {
  // Centro
  'Santiago': [
    { lat: -33.437, lng: -70.650 },
    { lat: -33.437, lng: -70.635 },
    { lat: -33.455, lng: -70.635 },
    { lat: -33.455, lng: -70.650 },
  ],
  
  // Oriente
  'Providencia': [
    { lat: -33.420, lng: -70.625 },
    { lat: -33.420, lng: -70.605 },
    { lat: -33.435, lng: -70.605 },
    { lat: -33.435, lng: -70.625 },
  ],
  
  'Las Condes': [
    { lat: -33.390, lng: -70.590 },
    { lat: -33.390, lng: -70.540 },
    { lat: -33.430, lng: -70.540 },
    { lat: -33.430, lng: -70.590 },
  ],
  
  'Vitacura': [
    { lat: -33.370, lng: -70.590 },
    { lat: -33.370, lng: -70.550 },
    { lat: -33.395, lng: -70.550 },
    { lat: -33.395, lng: -70.590 },
  ],
  
  'Lo Barnechea': [
    { lat: -33.330, lng: -70.540 },
    { lat: -33.330, lng: -70.480 },
    { lat: -33.380, lng: -70.480 },
    { lat: -33.380, lng: -70.540 },
  ],
  
  'Ñuñoa': [
    { lat: -33.440, lng: -70.610 },
    { lat: -33.440, lng: -70.590 },
    { lat: -33.465, lng: -70.590 },
    { lat: -33.465, lng: -70.610 },
  ],
  
  'La Reina': [
    { lat: -33.430, lng: -70.560 },
    { lat: -33.430, lng: -70.530 },
    { lat: -33.460, lng: -70.530 },
    { lat: -33.460, lng: -70.560 },
  ],
  
  'Macul': [
    { lat: -33.465, lng: -70.610 },
    { lat: -33.465, lng: -70.580 },
    { lat: -33.495, lng: -70.580 },
    { lat: -33.495, lng: -70.610 },
  ],
  
  'Peñalolén': [
    { lat: -33.460, lng: -70.570 },
    { lat: -33.460, lng: -70.530 },
    { lat: -33.510, lng: -70.530 },
    { lat: -33.510, lng: -70.570 },
  ],
  
  // Sur
  'La Florida': [
    { lat: -33.510, lng: -70.610 },
    { lat: -33.510, lng: -70.570 },
    { lat: -33.570, lng: -70.570 },
    { lat: -33.570, lng: -70.610 },
  ],
  
  'Puente Alto': [
    { lat: -33.570, lng: -70.600 },
    { lat: -33.570, lng: -70.540 },
    { lat: -33.630, lng: -70.540 },
    { lat: -33.630, lng: -70.600 },
  ],
  
  'San Bernardo': [
    { lat: -33.570, lng: -70.730 },
    { lat: -33.570, lng: -70.680 },
    { lat: -33.640, lng: -70.680 },
    { lat: -33.640, lng: -70.730 },
  ],
  
  'La Cisterna': [
    { lat: -33.520, lng: -70.670 },
    { lat: -33.520, lng: -70.650 },
    { lat: -33.540, lng: -70.650 },
    { lat: -33.540, lng: -70.670 },
  ],
  
  'San Miguel': [
    { lat: -33.490, lng: -70.660 },
    { lat: -33.490, lng: -70.640 },
    { lat: -33.510, lng: -70.640 },
    { lat: -33.510, lng: -70.660 },
  ],
  
  'San Joaquín': [
    { lat: -33.490, lng: -70.635 },
    { lat: -33.490, lng: -70.620 },
    { lat: -33.510, lng: -70.620 },
    { lat: -33.510, lng: -70.635 },
  ],
  
  'Pedro Aguirre Cerda': [
    { lat: -33.480, lng: -70.680 },
    { lat: -33.480, lng: -70.660 },
    { lat: -33.500, lng: -70.660 },
    { lat: -33.500, lng: -70.680 },
  ],
  
  'Lo Espejo': [
    { lat: -33.510, lng: -70.690 },
    { lat: -33.510, lng: -70.670 },
    { lat: -33.540, lng: -70.670 },
    { lat: -33.540, lng: -70.690 },
  ],
  
  'El Bosque': [
    { lat: -33.540, lng: -70.680 },
    { lat: -33.540, lng: -70.660 },
    { lat: -33.570, lng: -70.660 },
    { lat: -33.570, lng: -70.680 },
  ],
  
  'San Ramón': [
    { lat: -33.520, lng: -70.650 },
    { lat: -33.520, lng: -70.630 },
    { lat: -33.545, lng: -70.630 },
    { lat: -33.545, lng: -70.650 },
  ],
  
  'La Granja': [
    { lat: -33.540, lng: -70.640 },
    { lat: -33.540, lng: -70.615 },
    { lat: -33.570, lng: -70.615 },
    { lat: -33.570, lng: -70.640 },
  ],
  
  // Poniente
  'Maipú': [
    { lat: -33.480, lng: -70.780 },
    { lat: -33.480, lng: -70.720 },
    { lat: -33.540, lng: -70.720 },
    { lat: -33.540, lng: -70.780 },
  ],
  
  'Pudahuel': [
    { lat: -33.410, lng: -70.800 },
    { lat: -33.410, lng: -70.740 },
    { lat: -33.470, lng: -70.740 },
    { lat: -33.470, lng: -70.800 },
  ],
  
  'Cerrillos': [
    { lat: -33.480, lng: -70.720 },
    { lat: -33.480, lng: -70.690 },
    { lat: -33.510, lng: -70.690 },
    { lat: -33.510, lng: -70.720 },
  ],
  
  'Estación Central': [
    { lat: -33.460, lng: -70.700 },
    { lat: -33.460, lng: -70.680 },
    { lat: -33.480, lng: -70.680 },
    { lat: -33.480, lng: -70.700 },
  ],
  
  'Quinta Normal': [
    { lat: -33.430, lng: -70.710 },
    { lat: -33.430, lng: -70.685 },
    { lat: -33.450, lng: -70.685 },
    { lat: -33.450, lng: -70.710 },
  ],
  
  'Lo Prado': [
    { lat: -33.430, lng: -70.740 },
    { lat: -33.430, lng: -70.710 },
    { lat: -33.460, lng: -70.710 },
    { lat: -33.460, lng: -70.740 },
  ],
  
  'Cerro Navia': [
    { lat: -33.410, lng: -70.750 },
    { lat: -33.410, lng: -70.720 },
    { lat: -33.440, lng: -70.720 },
    { lat: -33.440, lng: -70.750 },
  ],
  
  'Renca': [
    { lat: -33.380, lng: -70.740 },
    { lat: -33.380, lng: -70.710 },
    { lat: -33.410, lng: -70.710 },
    { lat: -33.410, lng: -70.740 },
  ],
  
  // Norte
  'Quilicura': [
    { lat: -33.330, lng: -70.760 },
    { lat: -33.330, lng: -70.710 },
    { lat: -33.370, lng: -70.710 },
    { lat: -33.370, lng: -70.760 },
  ],
  
  'Huechuraba': [
    { lat: -33.350, lng: -70.670 },
    { lat: -33.350, lng: -70.630 },
    { lat: -33.380, lng: -70.630 },
    { lat: -33.380, lng: -70.670 },
  ],
  
  'Conchalí': [
    { lat: -33.370, lng: -70.690 },
    { lat: -33.370, lng: -70.660 },
    { lat: -33.400, lng: -70.660 },
    { lat: -33.400, lng: -70.690 },
  ],
  
  'Recoleta': [
    { lat: -33.410, lng: -70.660 },
    { lat: -33.410, lng: -70.635 },
    { lat: -33.435, lng: -70.635 },
    { lat: -33.435, lng: -70.660 },
  ],
  
  'Independencia': [
    { lat: -33.415, lng: -70.675 },
    { lat: -33.415, lng: -70.655 },
    { lat: -33.430, lng: -70.655 },
    { lat: -33.430, lng: -70.675 },
  ],
}

// Centro de Santiago para el mapa
export const SANTIAGO_CENTER = { lat: -33.4489, lng: -70.6693 }

