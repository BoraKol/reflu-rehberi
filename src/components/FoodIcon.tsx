import { memo } from 'react';
import {
  Apple,
  Banana,
  Bean,
  Beef,
  CakeSlice,
  Candy,
  Carrot,
  Citrus,
  Coffee,
  Croissant,
  CupSoda,
  Donut,
  Droplet,
  Drumstick,
  Egg,
  EggFried,
  Fish,
  Flame,
  GlassWater,
  Leaf,
  LeafyGreen,
  Milk,
  Nut,
  Pizza,
  Salad,
  Sandwich,
  Soup,
  Sprout,
  Utensils,
  Wheat,
  Wine,
  type LucideIcon,
} from 'lucide-react';
import type { FoodItem } from '../types/reflux';

/**
 * Pure Lucide-react (ISC licensed, royalty-free) icon keys mapped cleanly
 * to every verified food group and item in ReflüRehber.
 */
export type FoodIconKey =
  | 'apple'
  | 'banana'
  | 'bean'
  | 'beef'
  | 'cake'
  | 'candy'
  | 'carrot'
  | 'citrus'
  | 'coffee'
  | 'croissant'
  | 'cup-soda'
  | 'donut'
  | 'droplet'
  | 'drumstick'
  | 'egg'
  | 'egg-fried'
  | 'fish'
  | 'flame'
  | 'glass-water'
  | 'leaf'
  | 'leafy-green'
  | 'milk'
  | 'nut'
  | 'pizza'
  | 'salad'
  | 'sandwich'
  | 'soup'
  | 'sprout'
  | 'utensils'
  | 'wheat'
  | 'wine';

const FOOD_ID_TO_ICON: Record<string, FoodIconKey> = {
  // Sos & Baharat
  'domates-salcasi': 'droplet',
  ketcap: 'droplet',
  'sirke-tursu': 'droplet',
  'acili-ezme': 'flame',
  'aci-biber-isot': 'flame',
  sarimsak: 'flame',

  // İçecek (Coffee, CupSoda, GlassWater, Leaf, Wine)
  'demli-siyah-cay': 'coffee',
  'turk-kahvesi': 'coffee',
  'filtre-kahve': 'coffee',
  'yesil-cay': 'coffee',
  'papatya-cayi': 'coffee',
  'rezene-cayi': 'coffee',
  'ihlamur-cayi': 'coffee',
  'zencefil-cayi': 'coffee',
  'nane-cayi': 'leaf',
  'gazli-icecekler': 'cup-soda',
  'limonlu-soda': 'cup-soda',
  'sade-maden-suyu': 'cup-soda',
  ayran: 'glass-water',
  alkol: 'wine',

  // Sebze & Meyve (Carrot, LeafyGreen, Salad, Apple, Banana, Citrus, Sprout, Bean)
  havuc: 'carrot',
  'cig-domates': 'carrot',
  'cig-sogan': 'carrot',
  kabak: 'carrot',
  'haslanmis-patates': 'bean',
  salatalik: 'leafy-green',
  'taze-fasulye': 'leafy-green',
  ispanak: 'leaf',
  brokoli: 'sprout',
  avokado: 'sprout',
  'limon-narenciye': 'citrus',
  muz: 'banana',
  kavun: 'salad',
  armut: 'apple',
  'tatli-elma': 'apple',

  // Ana Yemek & Hamur İşi
  'cig-kofte': 'flame',
  'pogaca-acma': 'croissant',
  borek: 'croissant',
  simit: 'donut',
  kizartma: 'flame',
  'baharatli-sucuk': 'beef',
  'iskender-doner': 'beef',
  'salcali-mercimek-corbasi': 'soup',
  'sade-sebze-corbasi': 'soup',
  'kremali-makarna': 'soup',
  menemen: 'egg-fried',
  'lahmacun-pide': 'pizza',
  'beyaz-pirinc': 'wheat',
  'tam-tahilli-ekmek': 'wheat',
  'izgara-tavuk': 'drumstick',
  'izgara-hindi': 'drumstick',
  'bugulama-balik': 'fish',

  // Süt & Kahvaltılık
  'yulaf-ezmesi': 'wheat',
  'haslanmis-yumurta': 'egg',
  'yagsiz-yogurt': 'milk',
  kefir: 'milk',
  'lor-peyniri': 'sandwich',
  'tam-yagli-kasar': 'sandwich',

  // Atıştırmalık & Tatlı
  cikolata: 'candy',
  'serbetli-tatli': 'cake',
  'gec-saat-kuruyemis': 'nut',
  'cig-badem': 'nut',
  bal: 'droplet',
};

const CATEGORY_FALLBACK_ICON: Record<FoodItem['category'], FoodIconKey> = {
  İçecek: 'coffee',
  'Ana Yemek & Hamur İşi': 'utensils',
  'Sebze & Meyve': 'carrot',
  'Sos & Baharat': 'flame',
  'Süt & Kahvaltılık': 'milk',
  'Atıştırmalık & Tatlı': 'candy',
};

const ICON_COMPONENTS: Record<FoodIconKey, LucideIcon> = {
  apple: Apple,
  banana: Banana,
  bean: Bean,
  beef: Beef,
  cake: CakeSlice,
  candy: Candy,
  carrot: Carrot,
  citrus: Citrus,
  coffee: Coffee,
  croissant: Croissant,
  'cup-soda': CupSoda,
  donut: Donut,
  droplet: Droplet,
  drumstick: Drumstick,
  egg: Egg,
  'egg-fried': EggFried,
  fish: Fish,
  flame: Flame,
  'glass-water': GlassWater,
  leaf: Leaf,
  'leafy-green': LeafyGreen,
  milk: Milk,
  nut: Nut,
  pizza: Pizza,
  salad: Salad,
  sandwich: Sandwich,
  soup: Soup,
  sprout: Sprout,
  utensils: Utensils,
  wheat: Wheat,
  wine: Wine,
};

const CATEGORY_TINT: Record<
  FoodItem['category'],
  { bg: string; border: string; icon: string }
> = {
  İçecek: {
    bg: 'bg-[#EBF4FF]',
    border: 'border-[#CBE0FA]',
    icon: 'text-[#155CC0]',
  },
  'Sebze & Meyve': {
    bg: 'bg-[#ECFDF5]',
    border: 'border-[#B7EBD6]',
    icon: 'text-[#047857]',
  },
  'Sos & Baharat': {
    bg: 'bg-[#FEF2F2]',
    border: 'border-[#FECACA]',
    icon: 'text-[#B91C1C]',
  },
  'Ana Yemek & Hamur İşi': {
    bg: 'bg-[#FFFBEB]',
    border: 'border-[#FDE2A7]',
    icon: 'text-[#B45309]',
  },
  'Süt & Kahvaltılık': {
    bg: 'bg-[#F0F7FF]',
    border: 'border-[#C6D9ED]',
    icon: 'text-[#1D6FD6]',
  },
  'Atıştırmalık & Tatlı': {
    bg: 'bg-[#F4F8FC]',
    border: 'border-[#C6D9ED]',
    icon: 'text-[#455D75]',
  },
};

export function getFoodIconKey(
  food: Pick<FoodItem, 'id' | 'category'>
): FoodIconKey {
  return FOOD_ID_TO_ICON[food.id] ?? CATEGORY_FALLBACK_ICON[food.category];
}

interface FoodIconProps {
  food: Pick<FoodItem, 'id' | 'category'>;
  selected?: boolean;
  size?: 'sm' | 'md';
}

export const FoodIcon = memo(function FoodIcon({
  food,
  selected = false,
  size = 'sm',
}: FoodIconProps) {
  const iconKey = getFoodIconKey(food);
  const IconComp = ICON_COMPONENTS[iconKey];
  const tint = CATEGORY_TINT[food.category];

  const boxSize = size === 'md' ? 'w-11 h-11 rounded-xl' : 'w-9 h-9 rounded-xl';
  const glyphSize = size === 'md' ? 'w-5 h-5' : 'w-[18px] h-[18px]';

  return (
    <span
      data-food-icon={iconKey}
      aria-hidden="true"
      className={`${boxSize} border flex items-center justify-center shrink-0 transition-colors ${
        selected
          ? 'bg-white border-[#BBD6F7] text-[#155CC0] shadow-[0_2px_6px_rgba(29,111,214,0.12)]'
          : `${tint.bg} ${tint.border} ${tint.icon}`
      }`}
    >
      <IconComp className={glyphSize} strokeWidth={1.75} />
    </span>
  );
});
