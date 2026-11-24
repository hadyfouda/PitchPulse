/** Name pools by nationality, so first and last names always belong together. */
export interface NamePool {
  nation: string;
  weight: number;
  first: readonly string[];
  last: readonly string[];
}

export const NAME_POOLS: readonly NamePool[] = [
  { nation: 'EGY', weight: 3, first: ['Omar', 'Karim', 'Youssef', 'Mostafa', 'Hady', 'Ahmed', 'Tarek', 'Ziad', 'Marwan', 'Hamza', 'Mahmoud', 'Amr'], last: ['Hassan', 'Mansour', 'Fathy', 'Salah', 'Elneny', 'Ashour', 'Hegazy', 'Fouda', 'Zaki', 'Kamal', 'Shehata', 'Soliman'] },
  { nation: 'ESP', weight: 2, first: ['Diego', 'Iker', 'Pablo', 'Hugo', 'Alvaro', 'Sergio', 'Raul', 'Marcos'], last: ['Moreno', 'Navarro', 'Romero', 'Torres', 'Alonso', 'Vidal', 'Ruiz', 'Castillo'] },
  { nation: 'POR', weight: 1, first: ['Tiago', 'Bruno', 'Rafael', 'Joao', 'Andre', 'Nuno'], last: ['Silva', 'Costa', 'Ferreira', 'Rocha', 'Pereira', 'Carvalho'] },
  { nation: 'GER', weight: 2, first: ['Jonas', 'Felix', 'Leon', 'Lukas', 'Tobias', 'Niklas'], last: ['Keller', 'Brandt', 'Hoffmann', 'Kruger', 'Becker', 'Wagner'] },
  { nation: 'SCA', weight: 1, first: ['Emil', 'Lars', 'Sven', 'Mats', 'Anders', 'Kasper'], last: ['Lindqvist', 'Berg', 'Nielsen', 'Larsen', 'Holm', 'Dahl'] },
  { nation: 'NED', weight: 1, first: ['Daan', 'Joris', 'Bram', 'Stijn', 'Ruben'], last: ['Jansen', 'Vos', 'Dekker', 'de Boer', 'Visser'] },
  { nation: 'WAF', weight: 2, first: ['Kwame', 'Sadio', 'Idrissa', 'Moussa', 'Amadou', 'Bakary', 'Ismael', 'Yaya'], last: ['Mensah', 'Diallo', 'Traore', 'Koné', 'Sarr', 'Touré', 'Ndiaye', 'Camara'] },
  { nation: 'NGA', weight: 1, first: ['Victor', 'Samuel', 'Emeka', 'Chidi', 'Tunde'], last: ['Okafor', 'Osei', 'Adeyemi', 'Eze', 'Balogun'] },
  { nation: 'ENG', weight: 2, first: ['James', 'Ryan', 'Callum', 'Declan', 'Mason', 'Jude', 'Ethan', 'Owen'], last: ['Walker', 'Hughes', 'Bennett', 'Carter', 'Fletcher', 'Mitchell', 'Shaw', 'Barnes'] },
  { nation: 'JPN', weight: 1, first: ['Kenji', 'Takumi', 'Hiro', 'Daichi', 'Kaoru', 'Ritsu'], last: ['Tanaka', 'Sato', 'Watanabe', 'Mitoma', 'Endo', 'Kubo'] },
  { nation: 'KOR', weight: 1, first: ['Min-jae', 'Heung-min', 'Jae-sung', 'Kang-in', 'Hee-chan'], last: ['Kim', 'Park', 'Lee', 'Hwang', 'Jung'] },
  { nation: 'BAL', weight: 1, first: ['Andrei', 'Milan', 'Dusan', 'Luka', 'Ivan', 'Nikola'], last: ['Petrov', 'Novak', 'Kovač', 'Horvat', 'Marić', 'Jović'] }
];

export interface ClubSeed {
  name: string;
  short: string;
  primary: string;
  secondary: string;
}

export const CLUB_SEEDS: ClubSeed[] = [
  { name: 'Nile Valley FC', short: 'NVF', primary: '#10b981', secondary: '#064e3b' },
  { name: 'Harbor City', short: 'HBC', primary: '#3b82f6', secondary: '#1e3a8a' },
  { name: 'Red Dunes United', short: 'RDU', primary: '#ef4444', secondary: '#7f1d1d' },
  { name: 'Northgate Athletic', short: 'NGA', primary: '#f59e0b', secondary: '#78350f' },
  { name: 'Silverwood Rovers', short: 'SWR', primary: '#a1a1aa', secondary: '#3f3f46' },
  { name: 'Eastport Albion', short: 'EPA', primary: '#8b5cf6', secondary: '#4c1d95' },
  { name: 'Coral Bay Town', short: 'CBT', primary: '#f472b6', secondary: '#831843' },
  { name: 'Ironbridge FC', short: 'IRB', primary: '#64748b', secondary: '#0f172a' },
  { name: 'Sunfield Wanderers', short: 'SFW', primary: '#facc15', secondary: '#713f12' },
  { name: 'Riverside Olympic', short: 'RSO', primary: '#06b6d4', secondary: '#164e63' },
  { name: 'Highland Spartans', short: 'HLS', primary: '#22c55e', secondary: '#14532d' },
  { name: 'Granite City', short: 'GRC', primary: '#f97316', secondary: '#7c2d12' }
];
