export interface FichaReferencia {
  titulo: string
  items: string[]
}

export const FICHAS_REFERENCIA: FichaReferencia[] = [
  {
    titulo: 'Potajes, cremas, sopas y chinos',
    items: [
      'Potajes: 250 g terminados por ración (200 g de verduras + 50 g de agua).',
      'Cremas: 250 g terminados por ración (200 g de verduras + 50 g de agua).',
      'Sopas: 250 g terminados por ración (150 g de verdura, pollo o pescado + 100 g de agua).',
      'Chinos: 250 g terminados por ración (200 g de verduras: 50 % papa y 50 % otras verduras + 50 g de agua).',
    ],
  },
  {
    titulo: 'Carnes y pescados por ración',
    items: [
      'Carne en filete: 150–180 g. Pollo jamoncito: 200 g. Pollo muslo: 250 g.',
      'Carne para estofado: 100 g. Hamburguesa: 150 g. Albóndigas: 5 unidades (120 g).',
      'Pescado en filete o corte: 120–150 g. Marinera o marmitaco: 100 g. Medallón con espina: 140–160 g.',
    ],
  },
  {
    titulo: 'Arroces, pastas, fideuás y estofados',
    items: [
      'Arroz: 80 g en seco + 100 g de proteína + 60 g de fritura o verduras por ración.',
      'Pasta: 70–80 g en seco por ración.',
      'Fideuá: 80 g de pasta seca + 100 g de proteína + 60 g de fritura o verduras por ración.',
      'Estofado: 120 g de proteína + 50 g de verduras o fritura + 50 g de papa por ración.',
    ],
  },
  {
    titulo: 'Guarniciones',
    items: [
      'Verdura: 120 g congelada o cruda por ración. Arroz: 50 g en seco por ración.',
      'Papa: 110 g congelada por ración. Fritos: 100 g por ración.',
      'En una doble guarnición se usa la mitad del peso de cada guarnición.',
    ],
  },
  {
    titulo: 'Cremas con puré liofilizado',
    items: [
      'Fondear las verduras, añadir agua o caldo y cocer sin agregar papa.',
      'Diez minutos antes de terminar, añadir 150 g de puré liofilizado por cada kg de papa indicado en la ficha y mezclar con varilla.',
      'Cocer 10 minutos, texturizar, rectificar de sal, controlar la temperatura y repartir por centro en mono o multiporción.',
    ],
  },
]
