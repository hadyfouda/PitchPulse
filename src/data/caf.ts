/**
 * African clubs for the CAF Champions League and CAF Confederation Cup.
 *
 * The 16 clubs that reached the 2025/26 group stages (besides the Egyptian sides) are in the pools, plus clubs
 * that typically go out in the second qualifying round. Squads are generated with names from the club's region;
 * levels sit on the same scale as the Egyptian league (Al Ahly / Pyramids 74).
 */
import type { NamePool } from './names.ts';
import { NAME_POOLS } from './names.ts';

export type CafRegion = 'MAGHREB' | 'SUDAN' | 'SOUTH' | 'EAST' | 'CENTRAL' | 'ANGOLA' | 'WEST' | 'NIGERIA' | 'ETHIOPIA' | 'ZAMBIA';

export interface CafClub {
  slug: string;
  name: string;
  short: string;
  /** ISO-3 country code. */
  country: string;
  region: CafRegion;
  level: number;
  primary: string;
  secondary: string;
}

const club = (slug: string, name: string, short: string, country: string, region: CafRegion, level: number, primary: string, secondary: string): CafClub =>
  ({ slug, name, short, country, region, level, primary, secondary });

/** Champions League entrants from outside Egypt. */
export const CAF_CL_CLUBS: readonly CafClub[] = [
  club('sundowns', 'Mamelodi Sundowns', 'MSU', 'RSA', 'SOUTH', 74, '#facc15', '#1e3a8a'),
  club('esperance', 'Espérance de Tunis', 'EST', 'TUN', 'MAGHREB', 71, '#dc2626', '#facc15'),
  club('berkane', 'RS Berkane', 'RSB', 'MAR', 'MAGHREB', 71, '#f97316', '#111827'),
  club('asfar', 'AS FAR', 'FAR', 'MAR', 'MAGHREB', 70, '#b91c1c', '#15803d'),
  club('hilal', 'Al Hilal Omdurman', 'HIL', 'SDN', 'SUDAN', 69, '#1d4ed8', '#f8fafc'),
  club('mca', 'MC Alger', 'MCA', 'ALG', 'MAGHREB', 68, '#dc2626', '#15803d'),
  club('yanga', 'Young Africans', 'YAN', 'TAN', 'EAST', 68, '#15803d', '#facc15'),
  club('simba', 'Simba SC', 'SIM', 'TAN', 'EAST', 67, '#dc2626', '#f8fafc'),
  club('petro', 'Petro de Luanda', 'PET', 'ANG', 'ANGOLA', 67, '#1d4ed8', '#facc15'),
  club('jsk', 'JS Kabylie', 'JSK', 'ALG', 'MAGHREB', 66, '#facc15', '#15803d'),
  club('stademalien', 'Stade Malien', 'STM', 'MLI', 'WEST', 64, '#15803d', '#f8fafc'),
  club('rivers', 'Rivers United', 'RIV', 'NGA', 'NIGERIA', 64, '#1d4ed8', '#f8fafc'),
  club('powerdynamos', 'Power Dynamos', 'PDY', 'ZAM', 'ZAMBIA', 63, '#f97316', '#111827'),
  club('lupopo', 'Saint-Éloi Lupopo', 'LUP', 'COD', 'CENTRAL', 63, '#dc2626', '#facc15'),
  club('pirates', 'Orlando Pirates', 'ORL', 'RSA', 'SOUTH', 69, '#111827', '#f8fafc'),
  club('mazembe', 'TP Mazembe', 'TPM', 'COD', 'CENTRAL', 65, '#111827', '#f8fafc'),
  club('ahlitripoli', 'Al Ahly Tripoli', 'ATR', 'LBY', 'MAGHREB', 64, '#15803d', '#f8fafc'),
  club('setif', 'ES Sétif', 'ESS', 'ALG', 'MAGHREB', 63, '#111827', '#f8fafc'),
  club('merrikh', 'Al Merrikh', 'MER', 'SDN', 'SUDAN', 63, '#dc2626', '#facc15'),
  club('asec', 'ASEC Mimosas', 'ASE', 'CIV', 'WEST', 63, '#f97316', '#111827'),
  club('horoya', 'Horoya AC', 'HOR', 'GUI', 'WEST', 61, '#dc2626', '#facc15'),
  club('remo', 'Remo Stars', 'REM', 'NGA', 'NIGERIA', 59, '#1d4ed8', '#f8fafc'),
  club('vipers', 'Vipers SC', 'VIP', 'UGA', 'EAST', 59, '#7c3aed', '#f8fafc'),
  club('goldstars', 'Bibiani Gold Stars', 'BGS', 'GHA', 'WEST', 58, '#facc15', '#111827'),
  club('nouadhibou', 'FC Nouadhibou', 'NDB', 'MTN', 'MAGHREB', 58, '#f97316', '#1d4ed8'),
  club('gormahia', 'Gor Mahia', 'GOR', 'KEN', 'EAST', 58, '#15803d', '#f8fafc'),
  club('ethinsurance', 'Ethiopian Insurance', 'EIN', 'ETH', 'ETHIOPIA', 57, '#0ea5e9', '#f8fafc'),
  club('teungueth', 'Teungueth FC', 'TEU', 'SEN', 'WEST', 57, '#f8fafc', '#dc2626'),
  club('dynamos', 'Dynamos FC', 'DYN', 'ZIM', 'SOUTH', 56, '#1d4ed8', '#f8fafc'),
  club('watanga', 'Watanga FC', 'WAT', 'LBR', 'WEST', 55, '#15803d', '#facc15')
];

/** Confederation Cup entrants from outside Egypt. */
export const CAF_CC_CLUBS: readonly CafClub[] = [
  club('wydad', 'Wydad AC', 'WAC', 'MAR', 'MAGHREB', 69, '#dc2626', '#f8fafc'),
  club('usma', 'USM Alger', 'USM', 'ALG', 'MAGHREB', 67, '#dc2626', '#111827'),
  club('raja', 'Raja Casablanca', 'RCA', 'MAR', 'MAGHREB', 67, '#15803d', '#f8fafc'),
  club('crb', 'CR Belouizdad', 'CRB', 'ALG', 'MAGHREB', 66, '#dc2626', '#f8fafc'),
  club('chiefs', 'Kaizer Chiefs', 'KC', 'RSA', 'SOUTH', 66, '#facc15', '#111827'),
  club('etoile', 'Étoile du Sahel', 'ESS', 'TUN', 'MAGHREB', 66, '#dc2626', '#f8fafc'),
  club('africain', 'Club Africain', 'CA', 'TUN', 'MAGHREB', 65, '#dc2626', '#f8fafc'),
  club('stellenbosch', 'Stellenbosch FC', 'STE', 'RSA', 'SOUTH', 65, '#7f1d1d', '#facc15'),
  club('sfaxien', 'CS Sfaxien', 'CSS', 'TUN', 'MAGHREB', 64, '#111827', '#f8fafc'),
  club('safi', 'Olympic Safi', 'OCS', 'MAR', 'MAGHREB', 64, '#1d4ed8', '#f8fafc'),
  club('azam', 'Azam FC', 'AZA', 'TAN', 'EAST', 64, '#0ea5e9', '#f8fafc'),
  club('ittihadtripoli', 'Al Ittihad Tripoli', 'ITR', 'LBY', 'MAGHREB', 63, '#dc2626', '#f8fafc'),
  club('maniema', 'AS Maniema Union', 'MAN', 'COD', 'CENTRAL', 62, '#dc2626', '#111827'),
  club('zesco', 'ZESCO United', 'ZES', 'ZAM', 'ZAMBIA', 62, '#1d4ed8', '#f8fafc'),
  club('kawkab', 'Kawkab Marrakech', 'KAC', 'MAR', 'MAGHREB', 62, '#dc2626', '#f8fafc'),
  club('djoliba', 'Djoliba AC', 'DJO', 'MLI', 'WEST', 61, '#dc2626', '#f8fafc'),
  club('sanpedro', 'FC San Pédro', 'SPE', 'CIV', 'WEST', 61, '#f97316', '#1d4ed8'),
  club('singida', 'Singida Black Stars', 'SBS', 'TAN', 'EAST', 61, '#111827', '#facc15'),
  club('enyimba', 'Enyimba', 'ENY', 'NGA', 'NIGERIA', 61, '#1d4ed8', '#f8fafc'),
  club('kotoko', 'Asante Kotoko', 'KOT', 'GHA', 'WEST', 61, '#dc2626', '#f8fafc'),
  club('ahlibenghazi', 'Al Ahli Benghazi', 'ABZ', 'LBY', 'MAGHREB', 61, '#15803d', '#f8fafc'),
  club('otoho', 'AS Otohô', 'OTO', 'CGO', 'CENTRAL', 60, '#facc15', '#15803d'),
  club('cotonsport', 'Coton Sport', 'COT', 'CMR', 'WEST', 60, '#15803d', '#f8fafc'),
  club('sagrada', 'Sagrada Esperança', 'SAG', 'ANG', 'ANGOLA', 60, '#15803d', '#f8fafc'),
  club('amazulu', 'AmaZulu FC', 'AMZ', 'RSA', 'SOUTH', 60, '#15803d', '#f8fafc'),
  club('jaraaf', 'ASC Jaraaf', 'JAR', 'SEN', 'WEST', 59, '#15803d', '#f8fafc'),
  club('dreams', 'Dreams FC', 'DRM', 'GHA', 'WEST', 59, '#111827', '#facc15'),
  club('bravos', 'Bravos do Maquis', 'BRA', 'ANG', 'ANGOLA', 58, '#dc2626', '#f8fafc'),
  club('nairobi', 'Nairobi United', 'NRB', 'KEN', 'EAST', 57, '#1d4ed8', '#f8fafc'),
  club('fasil', 'Fasil Kenema', 'FAS', 'ETH', 'ETHIOPIA', 56, '#dc2626', '#f8fafc')
];

const pool = (nation: string, first: string[], last: string[]): NamePool => ({ nation, weight: 1, first, last });

const REGION_POOLS: Record<CafRegion, (country: string) => NamePool> = {
  MAGHREB: c => pool(c,
    ['Youssef', 'Ayoub', 'Hamza', 'Anas', 'Mehdi', 'Oussama', 'Ilyes', 'Bilel', 'Houssem', 'Achraf', 'Zakaria', 'Soufiane', 'Riad', 'Aymen', 'Walid', 'Islam', 'Yassine', 'Amine'],
    ['El Idrissi', 'Benali', 'Bouzid', 'Mansouri', 'Haddad', 'Saidi', 'Belaid', 'Jaziri', 'Zerrouki', 'Chaabane', 'Ben Romdhane', 'Amrani', 'Tounsi', 'Laaribi', 'Ferjani', 'Bennani', 'Belkacem', 'Mahrez']),
  SUDAN: c => pool(c,
    ['Mohamed', 'Abdelrahman', 'Waleed', 'Musab', 'Yasir', 'Mazin', 'Ammar', 'Salah', 'Mohanad', 'Ramadan'],
    ['Bakhit', 'Eltayeb', 'Abdelrahim', 'Kaber', 'Osman', 'Hamid', 'Babiker', 'Agab', 'Elsir', 'Mahjoub']),
  SOUTH: c => pool(c,
    ['Thabo', 'Sipho', 'Teboho', 'Themba', 'Lebo', 'Siyabonga', 'Mthunzi', 'Tshepo', 'Relebohile', 'Bongani', 'Khuliso', 'Thapelo'],
    ['Mokoena', 'Zwane', 'Dlamini', 'Ndlovu', 'Maseko', 'Khumalo', 'Mofokeng', 'Sithole', 'Mabasa', 'Shabalala', 'Mudau', 'Maswanganyi']),
  EAST: c => pool(c,
    ['Baraka', 'Juma', 'Feisal', 'Ibrahim', 'Clement', 'Kennedy', 'Mudathir', 'Shomari', 'Erasto', 'Abdul', 'Dickson', 'Kibwana'],
    ['Mwamba', 'Kibu', 'Otieno', 'Omondi', 'Mkude', 'Kapama', 'Nyoni', 'Mzamiru', 'Ngoma', 'Mwita', 'Wanyama', 'Okumu']),
  CENTRAL: c => pool(c,
    ['Fiston', 'Glody', 'Gaël', 'Trésor', 'Chancel', 'Meschack', 'Jackson', 'Héritier', 'Ricky', 'Exaucé', 'Arsène', 'Merveille'],
    ['Mayele', 'Kalala', 'Tshibangu', 'Mbemba', 'Bolingi', 'Kakuta', 'Muleka', 'Inonga', 'Mpia', 'Elia', 'Lusamba', 'Ngonda']),
  ANGOLA: c => pool(c,
    ['Gelson', 'Jacinto', 'Zini', 'Nandinho', 'Dany', 'Mário', 'Hélder', 'Kinito', 'Gaspar', 'Adilson', 'Isaac', 'Ary'],
    ['Dala', 'Carneiro', 'Massunguna', 'Mabululu', 'Quiala', 'Fernandes', 'Manuel', 'Domingos', 'Kialonda', 'Bastos', 'Paulo', 'Mendes']),
  WEST: c => pool(c,
    ['Kwame', 'Sadio', 'Idrissa', 'Moussa', 'Amadou', 'Bakary', 'Ismael', 'Yaya', 'Seydou', 'Cheick', 'Kofi', 'Aboubacar'],
    ['Mensah', 'Diallo', 'Traoré', 'Koné', 'Sarr', 'Touré', 'Ndiaye', 'Camara', 'Coulibaly', 'Keita', 'Fofana', 'Boateng']),
  NIGERIA: c => pool(c,
    ['Victor', 'Samuel', 'Emeka', 'Chidi', 'Tunde', 'Ifeanyi', 'Sunday', 'Kelechi', 'Ademola', 'Olamide'],
    ['Okafor', 'Adeyemi', 'Eze', 'Balogun', 'Nwosu', 'Okonkwo', 'Ogunleye', 'Uzoho', 'Bassey', 'Akinola']),
  ETHIOPIA: c => pool(c,
    ['Abel', 'Getaneh', 'Amanuel', 'Shimelis', 'Surafel', 'Biniyam', 'Dawit', 'Yonatan'],
    ['Kebede', 'Tesfaye', 'Haile', 'Bekele', 'Girma', 'Alemu', 'Mengistu', 'Wolde']),
  ZAMBIA: c => pool(c,
    ['Patson', 'Fashion', 'Enock', 'Kings', 'Lameck', 'Clatous', 'Emmanuel', 'Prince', 'Golden', 'Lubambo'],
    ['Daka', 'Sakala', 'Mwepu', 'Banda', 'Chama', 'Phiri', 'Musonda', 'Mulenga', 'Chisamba', 'Kangwa'])
};

/** Mostly local names, with a few West African and North African imports. */
export function cafNamePools(c: CafClub): NamePool[] {
  const local = { ...REGION_POOLS[c.region](c.country), weight: 8 };
  const imports = NAME_POOLS.filter(p => p.nation === 'WAF' || p.nation === 'NGA')
    .map(p => ({ ...p, nation: p.nation === 'WAF' ? 'SEN' : p.nation, weight: 0.8 }));
  return [local, ...imports];
}
