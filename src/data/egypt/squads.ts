/**
 * Real Egyptian Premier League squads, transcribed from the FotMob squad screenshots sent on 24 Nov 2026.
 * Names, shirt numbers, nationality (ISO-3) and age are as shown there. `number: null` = no number listed;
 * `age: null` = not visible in the screenshot. `injured` = marked injured at the time.
 * Ratings are NOT real data — they are estimated later from club strength, age and squad role.
 */
export type SquadPos = 'GK' | 'DEF' | 'MID' | 'FWD';

export interface RealPlayer {
  name: string;
  number: number | null;
  pos: SquadPos;
  nat: string;
  age: number | null;
  injured?: boolean;
}

export interface RealClub {
  id: string;
  name: string;
  shortName: string;
  coach: { name: string; nat: string; age: number | null } | null;
  /** True once every position group has been received. */
  complete: boolean;
  missing?: string;
  players: RealPlayer[];
}

const p = (number: number | null, name: string, pos: SquadPos, nat: string, age: number | null, injured = false): RealPlayer =>
  (injured ? { name, number, pos, nat, age, injured } : { name, number, pos, nat, age });

export const EGYPT_SQUADS: RealClub[] = [
  {
    id: 'ahly', name: 'Al Ahly', shortName: 'AHL', coach: { name: 'Houssaine Ammouta', nat: 'MAR', age: 57 }, complete: true,
    missing: 'Age of Ahmed Koka not visible',
    players: [
      p(1, 'Mohamed El Shenawy', 'GK', 'EGY', 37), p(16, 'Hamza Alaa', 'GK', 'EGY', 25), p(31, 'Mostafa Shobeir', 'GK', 'EGY', 26),
      p(null, 'Ibrahim El Asyuti', 'DEF', 'EGY', 21), p(2, 'Yassin Marei', 'DEF', 'EGY', 25), p(3, 'Achraf Dari', 'DEF', 'MAR', 27),
      p(5, 'Hady Reyad', 'DEF', 'EGY', 28), p(6, 'Yasser Ibrahim', 'DEF', 'EGY', 33), p(11, 'Karim El Debes', 'DEF', 'EGY', 23),
      p(20, 'Youssef Belammari', 'DEF', 'MAR', 28, true), p(24, 'Ahmed Eid', 'DEF', 'EGY', 25), p(24, 'Tawfik Mohamed', 'DEF', 'EGY', 26),
      p(26, 'Amr El Gazar', 'DEF', 'EGY', 27, true), p(28, 'Karim Fouad', 'DEF', 'EGY', 27), p(30, 'Mohamed Hany', 'DEF', 'EGY', 30),
      p(36, 'Ahmed Koka', 'DEF', 'EGY', null),
      p(8, 'Ahmed Reda', 'MID', 'EGY', 26), p(12, 'Akram Tawfik', 'MID', 'EGY', 29), p(13, 'Marwan Attia', 'MID', 'EGY', 28),
      p(15, 'Omar El Saeey', 'MID', 'EGY', 23), p(19, 'Afsha', 'MID', 'EGY', 30), p(21, 'Ali Mahmoud', 'MID', 'EGY', 21),
      p(22, 'Emam Ashour', 'MID', 'EGY', 28), p(35, 'Kabaka', 'MID', 'EGY', 21),
      p(null, 'Reda Slim', 'FWD', 'MAR', 27), p(7, 'Taher Mohamed', 'FWD', 'EGY', 29), p(9, 'Soufiane Benjdida', 'FWD', 'MAR', 25),
      p(10, 'Monsef Bakrar', 'FWD', 'ALG', 25), p(14, 'Hussein El Shahat', 'FWD', 'EGY', 34), p(17, 'Achraf Bencharki', 'FWD', 'MAR', 32),
      p(25, 'Zizo', 'FWD', 'EGY', 30), p(27, 'Aqtay Abdallah', 'FWD', 'EGY', 23), p(32, 'Mohamed Raafat', 'FWD', 'EGY', 21),
      p(38, 'Mohamed Abdallah', 'FWD', 'EGY', 21, true), p(39, 'Omar Moawad', 'FWD', 'EGY', 20), p(42, 'Mahmoud Salah', 'FWD', 'EGY', 19)
    ]
  },
  {
    id: 'zamalek', name: 'Zamalek', shortName: 'ZAM', coach: { name: 'Motamed Gamal', nat: 'EGY', age: 53 }, complete: true,
    players: [
      p(16, 'Mohamed Sobhi', 'GK', 'EGY', 27), p(37, 'El Mahdy Soliman', 'GK', 'EGY', 39), p(46, 'Mahmoud El Shenawy', 'GK', 'EGY', 22),
      p(99, 'Mohamed Awad', 'GK', 'EGY', 34),
      p(2, 'Ahmed Hossam', 'DEF', 'EGY', 25), p(3, 'Mahmoud Bentayg', 'DEF', 'MAR', 27), p(4, 'Omar Gaber', 'DEF', 'EGY', 34),
      p(11, 'Ahmed Esho', 'DEF', 'EGY', 23), p(13, 'Ahmed Fatouh', 'DEF', 'EGY', 28), p(20, 'Mostafa El Zenary', 'DEF', 'EGY', 27, true),
      p(24, 'Mohamed Ismail', 'DEF', 'EGY', 27), p(28, 'Mahmoud Hamdi El Wensh', 'DEF', 'EGY', 31), p(43, 'El Sayed Osama', 'DEF', 'EGY', 20),
      p(52, 'Mohamed Ibrahim', 'DEF', 'EGY', 21), p(58, 'Mohamed Farag', 'DEF', 'EGY', 18), p(97, 'Ahmed Khodary', 'DEF', 'EGY', 21),
      p(null, 'Ahmed Safwat', 'MID', 'EGY', 17), p(6, 'Mahmoud Gehad', 'MID', 'EGY', 25), p(12, 'Ahmed Rabie', 'MID', 'EGY', 25),
      p(17, 'Mohamed Shehata', 'MID', 'EGY', 25), p(18, 'Adam Kaied', 'MID', 'PLE', 24), p(19, 'Abdalla El Said', 'MID', 'EGY', 41),
      p(39, 'Mohamed El Sayed', 'MID', 'EGY', 20), p(44, 'Youssef Wael', 'MID', 'EGY', 21), p(55, 'Mohamed Hamad', 'MID', 'EGY', 18),
      p(7, 'Hossam Ashraf', 'FWD', 'EGY', 25), p(9, 'Naser Mansy', 'FWD', 'EGY', 29), p(21, 'Ahmed Jafeli', 'FWD', 'TUN', 23),
      p(31, 'Ahmed Sherif', 'FWD', 'EGY', 23), p(81, 'Chico Banza', 'FWD', 'ANG', 27), p(90, 'Amr Nasser', 'FWD', 'EGY', 27, true),
      p(98, 'Oday Dabbagh', 'FWD', 'PLE', 27)
    ]
  },
  {
    id: 'pyramids', name: 'Pyramids FC', shortName: 'PYR', coach: { name: 'Rhulani Mokwena', nat: 'RSA', age: 39 }, complete: true,
    missing: 'Age of Ziad Haytham not shown (user confirmed the list is complete)',
    players: [
      p(1, 'Ahmed El Shenawy', 'GK', 'EGY', 35), p(16, 'Ziad Haytham', 'GK', 'EGY', null), p(28, 'Mahmoud Gad', 'GK', 'EGY', 28),
      p(31, 'Hazem Gamal', 'GK', 'EGY', 21),
      p(3, 'Mahmoud Marei', 'DEF', 'EGY', 28), p(4, 'Ahmed Samy', 'DEF', 'EGY', 34), p(6, 'Osama Galal', 'DEF', 'EGY', 29, true),
      p(12, 'Ahmed Tawfik', 'DEF', 'EGY', 35, true), p(15, 'Mohamed Chibi', 'DEF', 'MAR', 33), p(21, 'Mohamed Hamdy', 'DEF', 'EGY', 31),
      p(24, 'Khaled Mohamed Awad', 'DEF', 'EGY', 23), p(29, 'Karim Hafez', 'DEF', 'EGY', 30), p(32, 'Ewerton', 'DEF', 'BRA', 29),
      p(34, 'Eyad El Askalany', 'DEF', 'EGY', 21),
      p(null, 'Samuel Amusan', 'MID', 'NGA', 21), p(5, 'Hamed Hamdan', 'MID', 'PLE', 26), p(8, 'Mahmoud Saber', 'MID', 'EGY', 25),
      p(9, 'Ahmed Abdelkader', 'MID', 'EGY', 27), p(14, 'Mohanad Lasheen', 'MID', 'EGY', 30), p(18, 'Walid El Karti', 'MID', 'MAR', 32),
      p(22, 'Nasser Maher', 'MID', 'EGY', 29), p(23, 'Otta', 'MID', 'EGY', 23), p(35, 'Ahmed Fawzi', 'MID', 'EGY', 24),
      p(null, 'Hasan Tarek', 'FWD', 'EGY', 21), p(7, 'Youssef Obama', 'FWD', 'EGY', 30), p(11, 'Mostafa Fathi', 'FWD', 'EGY', 32),
      p(13, 'Nadir Benbouali', 'FWD', 'ALG', 26), p(17, 'Zalaka', 'FWD', 'EGY', 27), p(20, 'Abdel Rahman Magdi', 'FWD', 'EGY', 29),
      p(25, 'Odeh Fakhoury', 'FWD', 'JOR', 21), p(26, 'Mohamed El Gabbas', 'FWD', 'EGY', 38), p(30, 'Mostafa Zico', 'FWD', 'EGY', 29),
      p(39, 'Mesho', 'FWD', 'EGY', 20)
    ]
  },
  {
    id: 'ceramica', name: 'Ceramica Cleopatra', shortName: 'CER', coach: { name: 'Moamen Soliman', nat: 'EGY', age: 52 }, complete: true,
    missing: 'Age of Fathy Mohamed not shown (Ahmed Belhadji is Moroccan — confirmed by the user)',
    players: [
      p(13, 'Mohamed Tarek', 'GK', 'EGY', 27), p(18, 'Mohamed Bassam', 'GK', 'EGY', 35), p(23, 'Mohamed Alaa', 'GK', 'EGY', 27),
      p(2, 'Ahmed Hany', 'DEF', 'EGY', 29), p(4, 'Ahmed Ramadan', 'DEF', 'EGY', 29), p(5, 'Ragab Nabil', 'DEF', 'EGY', 33),
      p(24, 'Arthur Justice', 'DEF', 'GHA', 28), p(27, 'Hussein El Sayed', 'DEF', 'EGY', 35), p(31, 'Moaz Mosaad', 'DEF', 'EGY', 23),
      p(32, 'Fawzi El Henawy', 'DEF', 'EGY', 28), p(66, 'Mohamed El Maghraby', 'DEF', 'EGY', 25),
      p(3, 'Fathy Mohamed', 'MID', 'EGY', null), p(6, 'Karim Nedved', 'MID', 'EGY', 29), p(8, 'Abdallah Magdy', 'MID', 'EGY', 29),
      p(10, 'Ahmed Belhadji', 'MID', 'MAR', 29), p(14, 'Ibrahim Mohamed', 'MID', 'EGY', 26), p(15, 'Samir El Eraki', 'MID', 'EGY', 25),
      p(17, 'Amr El Soleya', 'MID', 'EGY', 36), p(28, 'Amr Kalawa', 'MID', 'EGY', 29), p(77, 'Mohamed Reda', 'MID', 'EGY', 26),
      p(null, 'Ashour Shika', 'FWD', 'EGY', 24), p(7, 'Islam Issa', 'FWD', 'EGY', 30), p(9, 'Nejc Gradišar', 'FWD', 'SVN', 24),
      p(11, 'Sodiq Awujoola', 'FWD', 'NGA', 26), p(19, 'Ayman Mukka', 'FWD', 'EGY', 29), p(21, 'Peter Gwargis', 'FWD', 'IRQ', 26),
      p(22, 'Khaled Al Nabris', 'FWD', 'PLE', 23), p(25, 'Mohamed Shika', 'FWD', 'EGY', 29), p(29, 'Marwan Osman', 'FWD', 'EGY', 24),
      p(30, 'Mohamed Emad', 'FWD', 'EGY', 25)
    ]
  },
  {
    id: 'ittihad', name: 'Al Ittihad Alexandria', shortName: 'ITT', coach: { name: 'Hamza El Gamal', nat: 'EGY', age: 56 }, complete: true,
    missing: 'Last screenshot ends at #99 Islam Samir — assumed to be the last forward',
    players: [
      p(1, 'Sobhy Soliman', 'GK', 'EGY', 28), p(16, 'Ahmed El Arabi', 'GK', 'EGY', 34), p(31, 'Ali El Gabry', 'GK', 'EGY', 25),
      p(40, 'Ahmed Menshawy', 'GK', 'EGY', 21),
      p(null, 'Ahmed El Shazly', 'DEF', 'EGY', 25), p(null, 'Moataz Mohamed', 'DEF', 'EGY', 21), p(4, 'Islam Abdallah', 'DEF', 'EGY', 25),
      p(5, 'Mostafa Ibrahim', 'DEF', 'EGY', 26), p(7, 'Mohamed Mostafa Mido', 'DEF', 'EGY', 32), p(12, 'Moamen Sherif', 'DEF', 'EGY', 20),
      p(20, 'Mazen Osama', 'DEF', 'EGY', 23), p(24, 'Momen Awad', 'DEF', 'EGY', 25), p(30, 'Khaled Mosaad', 'DEF', 'EGY', 26),
      p(47, 'Mostafa Moawad', 'DEF', 'EGY', 29),
      p(null, 'Bibo Hassan', 'MID', 'EGY', 24), p(8, 'Mohamed Toni', 'MID', 'EGY', 30), p(14, 'Mohamed Fakhry', 'MID', 'EGY', 27),
      p(21, 'Ahmed Hamdi', 'MID', 'EGY', 28), p(22, 'Nour Alaa', 'MID', 'EGY', 24), p(23, 'Saviour Isaac', 'MID', 'NGA', 24),
      p(25, 'Mahmoud Emad', 'MID', 'EGY', 28), p(26, 'Mahmoud Abdul Aati Donga', 'MID', 'EGY', 33), p(33, 'Ahmed Abdel', 'MID', 'EGY', 27),
      p(37, 'Ahmed Atef', 'MID', 'EGY', 21), p(44, 'Kenneth Semakula', 'MID', 'UGA', 24), p(77, 'Ahmed Nagy', 'MID', 'EGY', 21),
      p(null, 'Ahmed El Sayed', 'FWD', 'EGY', 27), p(null, 'Anas Wael', 'FWD', 'EGY', 21), p(10, 'Hossam Hassan', 'FWD', 'EGY', 33),
      p(11, 'Youssry Wahid', 'FWD', 'EGY', 28), p(18, 'John Ebuka', 'FWD', 'NGA', 30), p(35, 'Pascal Phiri', 'FWD', 'ZAM', 21),
      p(80, 'J. Arumala', 'FWD', 'NGA', 22), p(99, 'Islam Samir', 'FWD', 'EGY', 27)
    ]
  },
  {
    id: 'modern', name: 'Modern Sport FC', shortName: 'MOD', coach: { name: 'Amine Benhachem', nat: 'MAR', age: 51 }, complete: true,
    missing: 'Ages of Mohamed Sobhi (#83) and Selim Soliman not shown; #37 listed twice (Yousri, Youssef Ali)',
    players: [
      p(null, 'Sayed Sobhy', 'GK', 'EGY', 25), p(18, 'Mahmoud El Zonfoly', 'GK', 'EGY', 34), p(99, 'Mostafa Makhlouf', 'GK', 'EGY', 23),
      p(null, 'Adham Nabil', 'DEF', 'EGY', 21), p(2, 'Karim Yehia', 'DEF', 'EGY', 28), p(3, 'Sharkia', 'DEF', 'EGY', 23),
      p(4, 'Khaled Reda', 'DEF', 'EGY', 37), p(5, 'Tarek Mohamed', 'DEF', 'EGY', 26), p(7, 'Adem Redjem', 'DEF', 'ALG', 29),
      p(11, 'Walid Mostafa', 'DEF', 'EGY', 26), p(15, 'Mostafa Ashraf', 'DEF', 'EGY', 25), p(20, 'Mahmoud El Halawani', 'DEF', 'EGY', 29),
      p(30, 'Ahmed Mazhoud', 'DEF', 'TUN', 31), p(33, 'Hamdi Marcelo', 'DEF', 'EGY', 23), p(37, 'Mohamed Yousri', 'DEF', 'EGY', 22),
      p(77, 'Ali Fawzi', 'DEF', 'EGY', 32), p(83, 'Mohamed Sobhi', 'DEF', 'EGY', null),
      p(8, 'Mohamed Sabry', 'MID', 'EGY', 26), p(12, 'Ahmed Youssef', 'MID', 'EGY', 27), p(27, 'Ghanam Mohamed', 'MID', 'EGY', 29),
      p(88, 'Abdel Rahman Rizk', 'MID', 'EGY', 26), p(98, 'Kamel Kaboria', 'MID', 'EGY', 29),
      p(null, 'Abdallah Hafez', 'FWD', 'EGY', 28), p(null, 'Ismail Ayodele', 'FWD', 'NGA', 22), p(null, 'Seif Oufa', 'FWD', 'EGY', 23),
      p(9, 'Mahmoud Mamdouh', 'FWD', 'EGY', 24), p(14, 'Ahmed Mostafa', 'FWD', 'EGY', 29), p(19, 'Mohamed Mossad', 'FWD', 'EGY', 25),
      p(22, 'Ali Zaazaa', 'FWD', 'EGY', 25), p(29, 'Michael Ephson', 'FWD', 'GHA', 22), p(37, 'Youssef Ali', 'FWD', 'EGY', 27),
      p(38, 'Arnold Eba', 'FWD', 'CMR', 23), p(70, 'Selim Soliman', 'FWD', 'EGY', null), p(90, 'Tito', 'FWD', 'EGY', 22)
    ]
  },
  {
    id: 'nbe', name: 'National Bank', shortName: 'NBE', coach: { name: 'Ayman El Ramadi', nat: 'EGY', age: 61 }, complete: true,
    missing: 'Ali Hamdi confirmed Egyptian by the user',
    players: [
      p(1, 'Ahmed Sobhi Afifi', 'GK', 'EGY', 32), p(27, 'Abdel Aziz El Balouti', 'GK', 'EGY', 32), p(31, 'Ahmed Tarek Soliman', 'GK', 'EGY', 26),
      p(2, 'Mohamed Nasr', 'DEF', 'EGY', 26), p(6, 'Mahmoud El Gazzar', 'DEF', 'EGY', 28), p(12, 'Ahmed Meteb', 'DEF', 'EGY', 30),
      p(13, 'Shefo', 'DEF', 'EGY', 25), p(20, 'Amir Medhat', 'DEF', 'EGY', 35), p(24, 'Mostafa Dowidar', 'DEF', 'EGY', 27),
      p(28, 'Hatem Mohamed Sukar', 'DEF', 'EGY', 25), p(33, 'Cyril Dao', 'DEF', 'BFA', 21),
      p(5, 'Alpha Boubacar Keita', 'MID', 'GUI', 23), p(8, 'Rashad Metwaly', 'MID', 'EGY', 25), p(10, 'Sayed Abdallah Sika', 'MID', 'EGY', 26),
      p(14, 'Ali Hamdi', 'MID', 'EGY', 27), p(17, 'Mody Naser', 'MID', 'EGY', 25), p(18, 'Karim Hamed', 'MID', 'EGY', 21),
      p(19, 'Salah Bouchama', 'MID', 'ALG', 25), p(21, 'Ahmed Madbouly', 'MID', 'EGY', 32), p(25, 'Bencharki', 'MID', 'EGY', 25),
      p(70, 'Mohamed Reda', 'MID', 'EGY', 20), p(77, 'Mohamed Gamal', 'MID', 'EGY', 26), p(99, 'Seif Adel', 'MID', 'EGY', 21),
      p(null, 'Boluwatife Adesanya', 'FWD', 'NGA', 19), p(7, 'Hesham Salah', 'FWD', 'EGY', 29), p(9, 'Osama Faisal', 'FWD', 'EGY', 25, true),
      p(11, 'Mostafa Shalaby', 'FWD', 'EGY', 32), p(22, 'Anderson Ceará', 'FWD', 'BRA', 27), p(23, 'Oufa', 'FWD', 'EGY', 30),
      p(29, 'Ahmed Yasser Rayyan', 'FWD', 'EGY', 28), p(30, 'Yaw Annor', 'FWD', 'TOG', 28)
    ]
  },
  {
    id: 'zed', name: 'ZED FC', shortName: 'ZED', coach: { name: 'Mohamed Shawky', nat: 'EGY', age: 45 }, complete: true,
    missing: 'Abdullah Boustenji confirmed Nigerian by the user; age of Marwan Hegy not shown',
    players: [
      p(1, 'Aly Lotfy', 'GK', 'EGY', 37), p(16, 'Mohamed Mazzika', 'GK', 'EGY', 32), p(31, 'Nader', 'GK', 'EGY', 23),
      p(36, 'Abdelmonem Tamer', 'GK', 'EGY', 20),
      p(2, 'Mohamed Hussein', 'DEF', 'EGY', 22), p(3, 'Abdallah Bakri', 'DEF', 'EGY', 32), p(4, 'Ahmed Castelo', 'DEF', 'EGY', 27),
      p(5, 'Ahmed Tarek', 'DEF', 'EGY', 25), p(8, 'Ahmed Sayed', 'DEF', 'EGY', 24), p(13, 'Amara Keita', 'DEF', 'SLE', 21),
      p(15, 'Sameh Ibrahim', 'DEF', 'EGY', 28), p(21, 'Mohamed Ashraf', 'DEF', 'EGY', 25), p(23, 'Tarek Alaa', 'DEF', 'EGY', 24),
      p(24, 'Abdel Rahman Gouda', 'DEF', 'EGY', 23), p(26, 'Mohamed Rabia', 'DEF', 'EGY', 30), p(32, 'Abdullah Boustenji', 'DEF', 'NGA', 21),
      p(34, 'Moussa Mohamed', 'DEF', 'EGY', 22), p(40, 'Marwan Hegy', 'DEF', 'EGY', null), p(73, 'Wajdi Nabhan', 'DEF', 'PLE', 25, true),
      p(18, 'Ahmed El Saghiri', 'MID', 'EGY', 28), p(19, 'Mohamed Ezz', 'MID', 'EGY', 23), p(20, 'Hamdy Alaa', 'MID', 'EGY', 26),
      p(22, 'Mahmoud Nabil', 'MID', 'EGY', 28), p(33, 'Mohamed Ibrahim', 'MID', 'EGY', 34), p(37, 'Maata Magassa', 'MID', 'MTN', 23),
      p(74, 'Mahmoud Sayed', 'MID', 'EGY', 23),
      p(null, 'Maged Hany', 'FWD', 'EGY', 23), p(null, 'Rasheed Ahmed', 'FWD', 'NGA', 26), p(7, 'Rafaat Khalil', 'FWD', 'EGY', 22),
      p(9, 'Ahmed Atef', 'FWD', 'EGY', 28), p(10, 'Mostafa Saad', 'FWD', 'EGY', 25), p(11, 'Abdelrahman El Banouby', 'FWD', 'EGY', 26),
      p(14, 'Ahmed Elkalamawy', 'FWD', 'EGY', 29), p(25, 'Sulahmana Bah', 'FWD', 'LBR', 25), p(30, 'Walid Farag', 'FWD', 'EGY', 25),
      p(35, 'Omar Khedr', 'FWD', 'EGY', 20), p(72, 'Marwane Hajij', 'FWD', 'FRA', 25)
    ]
  },
  {
    id: 'mokawloon', name: 'Al Mokawloon Al Arab', shortName: 'MOK', coach: { name: 'Samy Elsoudany', nat: 'EGY', age: 50 }, complete: true,
    missing: 'Ages of Ali Tarek, Youssef Abou-Hashima and Mohamed Refat not shown; #5 and #17 each listed twice',
    players: [
      p(1, 'Mahmoud Abou El-Saoud', 'GK', 'EGY', 38), p(16, 'Mahmoud El Hadary', 'GK', 'EGY', 33), p(18, 'Mohamed Fawzi', 'GK', 'EGY', 30),
      p(80, 'Ali Tarek', 'GK', 'EGY', null),
      p(2, 'Youssef Safina', 'DEF', 'EGY', 25), p(3, 'Mohamed Hamed', 'DEF', 'EGY', 32), p(4, 'Hassan Hussein', 'DEF', 'EGY', 28),
      p(5, 'Louay Wael', 'DEF', 'EGY', 34), p(5, 'Mohamed Ammar', 'DEF', 'EGY', 27), p(21, 'Sherif Reda', 'DEF', 'EGY', 29),
      p(23, 'Joseph Ochaya', 'DEF', 'UGA', 32), p(24, 'Nader Hesham', 'DEF', 'EGY', 27), p(26, 'Kahraba', 'DEF', 'EGY', 27),
      p(27, 'Khaled Abdelfattah', 'DEF', 'EGY', 27),
      p(6, 'Dokou Dodo', 'MID', 'BEN', 22), p(8, 'Ahmed Fouad', 'MID', 'EGY', 27), p(9, 'Mohamed Salem', 'MID', 'EGY', 32),
      p(12, 'Omar El-Wahsh', 'MID', 'EGY', 31), p(14, 'Moustafa Gamal', 'MID', 'EGY', 36), p(15, 'Mohammed Sandouqa', 'MID', 'PLE', 23),
      p(20, 'Islam Gaber', 'MID', 'EGY', 30), p(27, 'Youssef Abou-Hashima', 'MID', 'EGY', null), p(28, 'Ibrahim Adel', 'MID', 'EGY', 20),
      p(30, 'Abdelrahman Akmal', 'MID', 'EGY', 22),
      p(7, 'Anas Baniowuda', 'FWD', 'PLE', 25), p(10, 'Shokry Naguib', 'FWD', 'EGY', 32), p(17, 'Mohamed Refat', 'FWD', 'EGY', null),
      p(17, 'Mostafa Sobhi', 'FWD', 'EGY', 28), p(19, 'Ahmed Ouled Behi', 'FWD', 'TUN', 26), p(22, 'Mido Gaber', 'FWD', 'EGY', 34),
      p(25, 'Joackiam Ojera', 'FWD', 'UGA', 28), p(29, 'Omar Kamal', 'FWD', 'EGY', 33), p(74, 'Mohamed Abdelnasser', 'FWD', 'EGY', 20),
      p(92, 'Idrissa Thiam', 'FWD', 'MTN', 26), p(99, 'Shady Hussein', 'FWD', 'EGY', 33)
    ]
  },
  {
    id: 'smouha', name: 'Smouha SC', shortName: 'SMO', coach: { name: 'Ahmed Abdul Aziz', nat: 'EGY', age: 48 }, complete: true,
    missing: 'Ages of Ahmed Amin and Hady Amer not shown',
    players: [
      p(null, 'Mohamed Haidar', 'GK', 'EGY', 22), p(1, 'Hussein Taimour', 'GK', 'EGY', 26), p(28, 'Ahmed Mayhoub', 'GK', 'EGY', 30),
      p(null, 'Omar Mohsen', 'DEF', 'EGY', 20), p(2, 'Hesham Hafez', 'DEF', 'EGY', 25), p(3, 'Mohamed Desouki', 'DEF', 'EGY', 28),
      p(4, 'Ahmed Abdelrasoul', 'DEF', 'EGY', 30), p(6, 'Abdel Rahman Amer', 'DEF', 'EGY', 35), p(13, 'Clément Niyigena', 'DEF', 'RWA', 25),
      p(17, 'Ahmed El Nadry', 'DEF', 'EGY', 27), p(21, 'Abdelghani Mohamed', 'DEF', 'EGY', 24), p(24, 'Mohamed Ragab', 'DEF', 'EGY', 27),
      p(30, 'Ali Gamal', 'DEF', 'EGY', 27),
      p(7, 'Amr El Sisi', 'MID', 'EGY', 32), p(9, 'Marwan Hamdi', 'MID', 'EGY', 25), p(10, 'Khaled El Ghandour', 'MID', 'EGY', 32),
      p(15, 'Attidjikou Samadou', 'MID', 'BEN', 22), p(19, 'Mohamed Adel', 'MID', 'EGY', 31), p(22, 'Mohamed Abdel Samiae', 'MID', 'EGY', 26),
      p(66, 'Kone Mohamed', 'MID', 'CIV', 21), p(99, 'Ahmed Amin', 'MID', 'EGY', null),
      p(8, 'Samir Fekri', 'FWD', 'EGY', 31), p(11, 'Mohamed Farouk', 'FWD', 'EGY', 27), p(14, 'Makarona', 'FWD', 'EGY', 24),
      p(20, 'Pape Badji', 'FWD', 'SEN', 27), p(23, 'Fady Farid', 'FWD', 'EGY', 29), p(27, 'Hesham Balaha', 'FWD', 'EGY', 30),
      p(29, 'Gabriel Chukwudi', 'FWD', 'NGA', 23), p(45, 'Emmanuel Nweke', 'FWD', 'NGA', 19), p(77, 'Hady Amer', 'FWD', 'EGY', null),
      p(88, 'Ahmed Saleh', 'FWD', 'EGY', 21)
    ]
  },
  {
    id: 'petrojet', name: 'Petrojet-Suez', shortName: 'PET', coach: { name: 'Sayed Eid', nat: 'EGY', age: null }, complete: true,
    missing: 'Coach age and ages of Ahmed El Beblawy, Youssef Abdel-Tawab, Adel Ali and Ahmed Helmy not shown; #30 listed twice',
    players: [
      p(1, 'Omar Salah', 'GK', 'EGY', 28), p(16, 'Abdelkafi Ragab', 'GK', 'EGY', 31), p(77, 'Mohamed Khalifa', 'GK', 'EGY', 23),
      p(null, 'Faiz Ahmed', 'DEF', 'GHA', 22), p(3, 'Islam Abdallah', 'DEF', 'EGY', 23), p(4, 'Mahmoud Shedid Kenawi', 'DEF', 'EGY', 35),
      p(7, 'Karim El Deeb', 'DEF', 'EGY', 31), p(15, 'Ahmed Bahbah', 'DEF', 'EGY', 33), p(22, 'Omar Diyaa', 'DEF', 'EGY', 25),
      p(25, 'Barakat Haggag', 'DEF', 'EGY', 29), p(29, 'Ahmed Yassin', 'DEF', 'EGY', 29), p(32, 'Ahmed El Beblawy', 'DEF', 'EGY', null),
      p(40, 'Youssef Abdel-Tawab', 'DEF', 'EGY', null),
      p(null, 'Abdelrahman Labikh', 'MID', 'EGY', 26), p(2, 'Amadou Djoulde Bah', 'MID', 'GUI', 23), p(8, 'Mohamed Ali Okasha', 'MID', 'EGY', 28),
      p(12, 'Abdelrahman Ramadan', 'MID', 'EGY', 26), p(14, 'Mostafa El Gamal', 'MID', 'EGY', 29), p(17, 'Adham Hamed', 'MID', 'EGY', 26),
      p(19, 'Mostafa El Badry', 'MID', 'EGY', 29), p(27, 'Kgaogelo Sekgota', 'MID', 'RSA', 29), p(31, 'Adel Ali', 'MID', 'EGY', null),
      p(33, 'Ahmed Helmy', 'MID', 'EGY', null),
      p(9, 'Badr Mousa', 'FWD', 'PLE', 27), p(10, 'Samir Mohamed', 'FWD', 'EGY', 23), p(11, 'Mohamed Ibrahim', 'FWD', 'EGY', 23),
      p(13, 'Freddy Michael Kouablan', 'FWD', 'CIV', 28), p(21, 'Abubakar Liadi', 'FWD', 'NGA', 24), p(30, 'Godwin Chika', 'FWD', 'NGA', 29),
      p(30, 'Omar Reda', 'FWD', 'EGY', 23), p(99, 'Hossam Adel', 'FWD', 'EGY', 20)
    ]
  },
  {
    id: 'masry', name: 'Al Masry SC', shortName: 'MAS', coach: { name: 'Nabil Kouki', nat: 'TUN', age: 56 }, complete: true,
    missing: "Belia's age and nationality hidden (assumed Egyptian); Abdel Wahab Nader's age not shown; list assumed to end at #30 Deghmoum",
    players: [
      p(null, 'Ahmed Waheb', 'GK', 'EGY', 21), p(1, 'Essam Tharwat', 'GK', 'EGY', 37), p(16, 'Mahmoud Hamdy', 'GK', 'EGY', 33),
      p(26, 'Mohamed Seha', 'GK', 'EGY', 25), p(31, 'Mohamed Shehata', 'GK', 'EGY', 27),
      p(2, 'Baher El Mohamady', 'DEF', 'EGY', 29), p(3, 'Mohamed Shokry', 'DEF', 'EGY', 27), p(5, 'Khaled Sobhy', 'DEF', 'EGY', 31),
      p(7, 'Karim El Eraki', 'DEF', 'EGY', 28), p(13, 'Amr Saadawy', 'DEF', 'EGY', 29), p(17, 'Youssef El Gohary', 'DEF', 'EGY', 29),
      p(29, 'Mohamed Hashem', 'DEF', 'EGY', 31), p(33, 'Mostafa El Aash', 'DEF', 'EGY', 26), p(36, 'Abdel Wahab Nader', 'DEF', 'EGY', null),
      p(4, 'Yassin El Mallah', 'MID', 'EGY', 22), p(6, 'Mohamed Makhlouf', 'MID', 'EGY', 28), p(8, 'Hassan Ali', 'MID', 'EGY', 28),
      p(11, 'Mohamed El Shamy', 'MID', 'EGY', 30), p(12, 'Mostafa Abou El Khair', 'MID', 'EGY', 22), p(14, 'Mahmoud Hamada', 'MID', 'EGY', 32),
      p(18, 'Ameed Sawafta', 'MID', 'PLE', 26), p(20, 'Kheir Eddine Toual', 'MID', 'ALG', 25), p(24, 'Moustafa Zeidan', 'MID', 'PLE', 28),
      p(32, 'Hussein Faisal', 'MID', 'EGY', 27), p(35, 'Belia', 'MID', 'EGY', null), p(37, 'Ahmed Sharaf', 'MID', 'EGY', 21),
      p(null, 'Hossam Hassan', 'FWD', 'EGY', 20), p(9, 'Salah Mohsen', 'FWD', 'EGY', 28), p(10, 'Karim Bambo', 'FWD', 'EGY', 33),
      p(15, 'Ahmed El Armouty', 'FWD', 'EGY', 27), p(21, 'Ali Sulieman', 'FWD', 'ERI', 26), p(25, 'Mounder Temine', 'FWD', 'ALG', 25),
      p(27, 'Abdellah Ziani', 'FWD', 'MAR', 23), p(30, 'Abderrahim Deghmoum', 'FWD', 'ALG', 27)
    ]
  },
  {
    id: 'olympic', name: 'Olympic El Qanah FC', shortName: 'OLY', coach: { name: 'Abdelnaser Mohamed', nat: 'EGY', age: 56 }, complete: true,
    players: [
      p(1, 'Mostafa Mahmoud', 'GK', 'EGY', 29), p(16, 'Mohamed Shaaban', 'GK', 'EGY', 32), p(77, 'Mohamed Soliman', 'GK', 'EGY', 24),
      p(2, 'Momen Mahdy', 'DEF', 'EGY', 27), p(3, 'Ali Elfeel', 'DEF', 'EGY', 36), p(4, 'Mahmoud Rezk', 'DEF', 'EGY', 33),
      p(5, 'Ibrahim Samy', 'DEF', 'EGY', 24), p(12, 'Muhaisen Abu Jablah', 'DEF', 'JOR', 26), p(13, 'Mohamed Hany Treka', 'DEF', 'EGY', 27),
      p(15, 'Mohab Samy', 'DEF', 'EGY', 21), p(19, 'Mohamed El Shebini', 'DEF', 'EGY', 35), p(21, 'Islam Halima', 'DEF', 'EGY', 27),
      p(24, 'Mohamed Diab', 'DEF', 'EGY', 32), p(30, 'Osama El Nagar', 'DEF', 'EGY', 26), p(98, 'Hassan El Shazly', 'DEF', 'EGY', 31),
      p(6, 'Momen Rady', 'MID', 'EGY', 31), p(8, 'Mahmoud Hersha', 'MID', 'EGY', 31), p(20, 'Hafiz Ibrahim', 'MID', 'GHA', 24),
      p(25, 'Mostafa Hamada', 'MID', 'EGY', 26), p(27, 'Ahmed Ali', 'MID', 'EGY', 26), p(33, 'Mohamed Sadek', 'MID', 'EGY', 29),
      p(80, 'Ramy Najjarine', 'MID', 'LBN', 26),
      p(7, 'Hossam Greisha', 'FWD', 'EGY', 29), p(9, 'Hazem Abosena', 'FWD', 'EGY', 25), p(10, 'Mody Shalata', 'FWD', 'EGY', 25),
      p(11, 'Mohamed Hamdi', 'FWD', 'EGY', 34), p(17, 'Rudolf Mensah', 'FWD', 'GHA', 25), p(18, 'Mawuli Wayo', 'FWD', 'GHA', 23),
      p(22, 'Mohamed Antar', 'FWD', 'EGY', 33), p(40, 'Ibrahim El Sayed', 'FWD', 'EGY', 21), p(66, 'Mohamed Helal', 'FWD', 'EGY', 31)
    ]
  },
  {
    id: 'degla', name: 'Wadi Degla FC', shortName: 'WDG', coach: { name: 'Mostafa Shebeita', nat: 'EGY', age: 40 }, complete: true,
    players: [
      p(1, 'Amr Hossam', 'GK', 'EGY', 35), p(13, 'Ziad Seyam', 'GK', 'EGY', 23), p(18, 'Mohamed Greisha', 'GK', 'EGY', 20),
      p(99, 'Abdelrahman Qattawy', 'GK', 'EGY', 26),
      p(2, 'Shady Maher', 'DEF', 'EGY', 29), p(3, 'Omar Adly', 'DEF', 'EGY', 30), p(5, 'Ahmed Dahroug', 'DEF', 'EGY', 30),
      p(6, 'Kamal Abou Elfetouh', 'DEF', 'EGY', 29), p(15, 'Yehia Mostafa', 'DEF', 'EGY', 21), p(21, 'Ahmed Reda', 'DEF', 'EGY', 23),
      p(23, 'Ahmed Ayman', 'DEF', 'EGY', 31), p(24, 'Ragab El Safi', 'DEF', 'EGY', 27), p(28, 'Seif Teka', 'DEF', 'TUN', 35),
      p(40, 'Ahmed Abdin', 'DEF', 'EGY', 20),
      p(4, 'Kanu', 'MID', 'EGY', 33), p(8, 'Ahmed Scholes', 'MID', 'EGY', 28), p(14, 'Mohamed Abdel Aati', 'MID', 'EGY', 31),
      p(17, 'Hamza Hassan', 'MID', 'EGY', 18), p(19, 'Mahmoud Adel', 'MID', 'EGY', 22), p(20, 'Mohamed Saied Zeeka', 'MID', 'EGY', 26),
      p(25, 'Ibrahim El Bahnasi', 'MID', 'EGY', 24), p(30, 'Mohamed Fathi', 'MID', 'EGY', 32), p(33, 'Halimo', 'MID', 'EGY', 31),
      p(34, 'Mees Kaandorp', 'MID', 'NED', 28), p(42, 'Mohamed Barakat', 'MID', 'EGY', 18), p(44, 'Ahmed El Shimi', 'MID', 'EGY', 31),
      p(70, 'Adam El Mallah', 'MID', 'EGY', 19),
      p(7, 'Youssef Oya', 'FWD', 'EGY', 26), p(9, 'Franck Boli', 'FWD', 'CIV', 32), p(10, 'Mahmoud Diasty', 'FWD', 'EGY', 26),
      p(11, 'Mohamed Abdelrahim', 'FWD', 'EGY', 27), p(22, 'Zizo', 'FWD', 'EGY', 24), p(27, 'Ahmed Refaat', 'FWD', 'EGY', 26),
      p(32, 'Ahmed Farouk', 'FWD', 'EGY', 25), p(35, 'Sayed Mohamed Fouad', 'FWD', 'EGY', 22)
    ]
  },
  {
    id: 'gaish', name: "Tala'ea El Gaish", shortName: 'TEG', coach: { name: 'Gomaa Mashhour', nat: 'EGY', age: 48 }, complete: true,
    missing: 'Ages of Ahmed Tarek (#25) and Ayman Amir not shown',
    players: [
      p(1, 'Omar Radwan', 'GK', 'EGY', 29), p(18, 'Emad El Sayed', 'GK', 'EGY', 40), p(77, 'Mohamed Magdi', 'GK', 'EGY', 31),
      p(2, 'Momen Mahmoud', 'DEF', 'EGY', 23), p(3, 'Amro Tarek', 'DEF', 'EGY', 34, true), p(4, 'Mohamed Fathallah', 'DEF', 'EGY', 33),
      p(6, 'Khaled Stouhi', 'DEF', 'EGY', 37), p(8, 'Ahmed Abdel Rahman Zola', 'DEF', 'EGY', 33), p(15, 'Mahmoud Shabana', 'DEF', 'EGY', 31),
      p(19, 'Hamed Khaled', 'DEF', 'EGY', 27), p(20, 'Mahmoud Abdel Aziz', 'DEF', 'EGY', 24), p(24, 'Zaghloul El Zoughbi', 'DEF', 'EGY', 24),
      p(27, 'Ahmed Alaa', 'DEF', 'EGY', 32), p(34, 'Hossam Awad', 'DEF', 'EGY', 21),
      p(5, 'Houssem Souissi', 'MID', 'TUN', 29), p(14, 'Ahmed Wahid', 'MID', 'EGY', 21), p(17, 'Walid Benbella', 'MID', 'FRA', 25),
      p(21, 'Khaled Abo Ziada', 'MID', 'EGY', 27), p(22, 'Mostafa Khawaga', 'MID', 'EGY', 33), p(25, 'Ahmed Tarek', 'MID', 'EGY', null),
      p(31, 'Mohamed Yasser', 'MID', 'EGY', 19), p(32, 'Yehia Mostafa', 'MID', 'EGY', 23),
      p(7, 'Ragab Omran', 'FWD', 'EGY', 32), p(9, 'Fares Hatem', 'FWD', 'EGY', 23), p(10, 'Mohamed Hany', 'FWD', 'EGY', 24),
      p(11, 'Karim Tarek', 'FWD', 'EGY', 34), p(12, 'Islam Mohareb', 'FWD', 'EGY', 34), p(13, 'Komi Komlavi', 'FWD', 'TOG', 25),
      p(28, 'Ismaïl Ouro-Agoro', 'FWD', 'TOG', 30), p(30, 'Mohamed Atef', 'FWD', 'EGY', 24), p(33, 'Ayman Amir', 'FWD', 'EGY', null)
    ]
  },
  {
    id: 'enppi', name: 'Al Sharkeyah-ENPPI', shortName: 'ENP', coach: { name: 'Mohamed Barakat', nat: 'EGY', age: 34 }, complete: true,
    missing: 'Ages of Mohamed Abdelmonem and Youssef Abdelwahed not shown; #2/#20 Mohamed Samir and #13 listed twice',
    players: [
      p(1, 'Abdel Rahman Samir', 'GK', 'EGY', 26), p(16, 'Reda El Sayed', 'GK', 'EGY', 34), p(29, 'Ramadan Mostafa', 'GK', 'EGY', 27),
      p(null, 'Mohamed Abdelmonem', 'DEF', 'EGY', null), p(null, 'Mohanad Bakri', 'DEF', 'EGY', 24), p(null, 'Youssef Abdel Hafiz', 'DEF', 'EGY', 21),
      p(2, 'Mohamed Samir', 'DEF', 'EGY', 20), p(3, 'Marwan Dawoud', 'DEF', 'EGY', 29), p(4, 'Ahmed Kalosha', 'DEF', 'EGY', 27),
      p(5, 'Seif El Khashab', 'DEF', 'EGY', 28), p(8, 'Hesham Adel', 'DEF', 'EGY', 28), p(20, 'Mohamed Samir', 'DEF', 'EGY', 25),
      p(25, 'Sayed Said', 'DEF', 'EGY', 25), p(31, 'Ahmed Mahmoud', 'DEF', 'EGY', 23), p(32, 'Hazem Ibrahim', 'DEF', 'EGY', 23),
      p(36, 'Mohamed Sharkia', 'DEF', 'EGY', 24), p(47, 'Mohamed Hamdy', 'DEF', 'EGY', 23), p(74, 'Youssef Abdelwahed', 'DEF', 'EGY', null),
      p(90, 'Ahmed Sabeha', 'DEF', 'EGY', 27),
      p(null, 'Ahmed Shadad', 'MID', 'EGY', 24), p(6, 'Ziad Kamal', 'MID', 'EGY', 25), p(13, 'Ahmed Ismail Kofta', 'MID', 'EGY', 30),
      p(13, 'Razak Labode', 'MID', 'NGA', 18), p(14, 'Emad Mayhoub', 'MID', 'EGY', 25), p(17, 'Ammar Hamdi', 'MID', 'EGY', 27),
      p(18, 'Hossam Ghanem', 'MID', 'EGY', 27),
      p(19, 'Ali Ehab', 'MID', 'EGY', 20), p(22, 'Ahmed El Agouz', 'MID', 'EGY', 33), p(23, 'Mohamed Emad', 'MID', 'EGY', 21),
      p(30, 'Mohamed Essam', 'MID', 'EGY', 21), p(33, 'Omar Osama', 'MID', 'EGY', 21), p(39, 'Suleiman Kirki', 'MID', 'NGA', 23),
      p(77, 'Mohamed Sayed Goldy', 'MID', 'EGY', 24),
      p(null, 'Arafat Masoud', 'FWD', 'TAN', 19), p(null, 'Mostafa Fawzy', 'FWD', 'EGY', 27), p(7, 'Ahmed Hawash', 'FWD', 'EGY', 23),
      p(9, 'Mohamed El Nahass', 'FWD', 'EGY', 24), p(10, 'Kahraba', 'FWD', 'EGY', 32), p(11, 'Mohamed Hathout', 'FWD', 'EGY', 27),
      p(20, 'Youssef Labib', 'FWD', 'EGY', 25), p(21, 'Ahmed Ismail', 'FWD', 'EGY', 24), p(28, 'Hamed Abdallah', 'FWD', 'EGY', 21),
      p(35, 'Ousseynou Bodian', 'FWD', 'SEN', 26), p(37, 'Omar El Azab', 'FWD', 'EGY', 19), p(40, 'Anas Roshdy', 'FWD', 'EGY', 18)
    ]
  },
  {
    id: 'mahalla', name: 'Ghazl Al Mahalla', shortName: 'GHZ', coach: { name: 'Khaled Galal', nat: 'EGY', age: 59 }, complete: true,
    missing: "Ahmed Yasser's age not shown",
    players: [
      p(1, 'Ahmed El Nafarawy', 'GK', 'EGY', 28), p(16, 'Amer Amer', 'GK', 'EGY', 39), p(25, 'Mohamed Koko', 'GK', 'EGY', 35),
      p(3, 'Ahmed El Aash', 'DEF', 'EGY', 28), p(4, 'Ahmed Shousha', 'DEF', 'EGY', 33), p(5, 'Abdel Fattah Sheta', 'DEF', 'EGY', 24),
      p(10, 'Bassam Walid', 'DEF', 'EGY', 28), p(12, 'Yehia Zakaria', 'DEF', 'EGY', 24), p(13, 'Mostafa Oufa', 'DEF', 'EGY', 22),
      p(23, 'Fares Nechat Djabri', 'DEF', 'ALG', 25), p(27, 'Ahmed Gamal', 'DEF', 'EGY', 32), p(39, 'Abdallah Emad', 'DEF', 'EGY', 19),
      p(66, 'Abdel Rahman Rashdan', 'DEF', 'EGY', 23),
      p(6, 'Youssef Hassan', 'MID', 'EGY', 28), p(8, 'Moaz Abdelsalam', 'MID', 'EGY', 20), p(14, 'Abdelrahman Emad', 'MID', 'EGY', 27),
      p(17, 'Abdelrahman Shika', 'MID', 'EGY', 27), p(20, 'Mory Touré', 'MID', 'CIV', 23), p(37, 'Mahmoud El Moghazi', 'MID', 'EGY', 20),
      p(44, 'Ahmed Yasser', 'MID', 'EGY', null),
      p(null, 'Ahmad Wael', 'FWD', 'EGY', 22), p(7, 'Mohamed Ashraf', 'FWD', 'EGY', 28), p(9, 'Rached Arfaoui', 'FWD', 'TUN', 30),
      p(11, 'Mohamed Ekbad', 'FWD', 'MTN', 28), p(19, 'Armoosha', 'FWD', 'EGY', 26), p(22, 'Ahmed Etman', 'FWD', 'EGY', 23),
      p(30, 'Amr Gomaa', 'FWD', 'EGY', 27), p(32, 'Youssef El Azab', 'FWD', 'EGY', 23), p(41, 'Kibou Saïdi', 'FWD', 'COD', 20),
      p(63, 'Abdo Yehia', 'FWD', 'EGY', 27), p(81, 'Atef El Hakim', 'FWD', 'EGY', 21), p(99, 'Hazem El Askry', 'FWD', 'EGY', 23)
    ]
  },
  {
    id: 'asyut', name: 'Asyut Petroleum', shortName: 'ASP', coach: { name: 'Reda Shehata', nat: 'EGY', age: 45 }, complete: true,
    missing: 'Ages of Ahmed Gamal (#23 GK), Abdelrahman Morgan and Fares Ragab not shown',
    players: [
      p(1, 'Amgad Youssef', 'GK', 'EGY', 26), p(16, 'Karim Emad', 'GK', 'EGY', 29), p(23, 'Ahmed Gamal', 'GK', 'EGY', null),
      p(25, 'Abdelaziz Ahmed', 'GK', 'EGY', 27),
      p(4, 'Ali Mahran', 'DEF', 'EGY', 31), p(5, 'Mahmoud Alaa', 'DEF', 'EGY', 29), p(6, 'Ahmed Magdy', 'DEF', 'EGY', 21),
      p(20, 'Ahmed Shokry', 'DEF', 'EGY', 32), p(24, 'Mahmoud Okal', 'DEF', 'EGY', 32), p(29, 'Abdelrahman Morgan', 'DEF', 'EGY', null),
      p(30, 'Abdelrahman Medhat', 'DEF', 'EGY', 24), p(33, 'Fares Ragab', 'DEF', 'EGY', null), p(34, 'Khaled Abdelaal', 'DEF', 'EGY', 23),
      p(7, 'Ahmed Younes', 'MID', 'EGY', 24), p(11, 'Mostafa Sadada', 'MID', 'EGY', 28), p(12, 'Ziad Tarek El Sayed', 'MID', 'EGY', 25),
      p(13, 'Ismail Ashraf', 'MID', 'EGY', 27), p(17, 'Ahmed Hamza', 'MID', 'EGY', 32), p(18, 'Abdo Keshkesh', 'MID', 'EGY', 27),
      p(19, 'Ibrahim Abbas', 'MID', 'EGY', 27), p(21, 'Bakr Fawzi', 'MID', 'EGY', 27), p(22, 'Mohamed Hesha', 'MID', 'EGY', 27),
      p(26, 'Abdelrahman El Khamisi', 'MID', 'EGY', 26), p(31, 'Alabi Salam', 'MID', 'NGA', 23), p(32, 'Karim Kamel', 'MID', 'EGY', 23),
      p(null, 'Ahmed Arabi', 'FWD', 'EGY', 24), p(8, 'Fathy Gamal', 'FWD', 'EGY', 28), p(9, 'Mohamed Eid', 'FWD', 'EGY', 30),
      p(15, 'Ahmed Khaled', 'FWD', 'EGY', 25, true), p(35, 'Che Bodne', 'FWD', 'CMR', 24), p(38, 'Joshua Egaji', 'FWD', 'NGA', 21)
    ]
  },
  {
    id: 'aboqir', name: 'Abo Qir Semad', shortName: 'ABQ', coach: { name: 'Haitham Shaaban', nat: 'EGY', age: null }, complete: true,
    missing: 'Coach age not shown',
    players: [
      p(1, 'Mahmoud Gennesh', 'GK', 'EGY', 39), p(16, 'Sayed El Sawy', 'GK', 'EGY', 35), p(25, 'Mohamed Shika', 'GK', 'EGY', 33),
      p(null, 'Eyad Salah', 'DEF', 'EGY', 21), p(3, 'Gaber Kamel', 'DEF', 'EGY', 31), p(4, 'Mohamed Dabash', 'DEF', 'EGY', 35),
      p(5, 'Ahmed Fayez', 'DEF', 'EGY', 29), p(6, 'Mohamed Alaa', 'DEF', 'EGY', 26), p(12, 'Islam Ashraf', 'DEF', 'EGY', 27),
      p(20, 'Ahmed Awad', 'DEF', 'EGY', 31), p(24, 'Ayman El Gazar', 'DEF', 'EGY', 22), p(27, 'Ahmed Dahesh', 'DEF', 'EGY', 28),
      p(null, 'Bashar Shobaki', 'MID', 'PLE', 26), p(null, 'Seif Al Agouz', 'MID', 'EGY', 25), p(null, 'Ziad Reyad', 'MID', 'EGY', 23),
      p(null, 'Ziad Shaker', 'MID', 'EGY', 20), p(7, 'Mohamed Ocha', 'MID', 'EGY', 28), p(8, 'Emad Hamdy', 'MID', 'EGY', 33),
      p(11, 'Mostafa Shehata', 'MID', 'EGY', 25), p(13, 'Glid Otanga', 'MID', 'CGO', 26), p(14, 'Ramez Milad', 'MID', 'EGY', 28),
      p(15, 'Omar Ibrahim', 'MID', 'EGY', 29), p(17, 'Emad Fathi', 'MID', 'EGY', 33), p(21, 'Seif Shika', 'MID', 'EGY', 25),
      p(22, 'Ahmed Khaled', 'MID', 'EGY', 28), p(23, 'Favour Akem', 'MID', 'NGA', 22), p(26, 'Quaison Kofi Gideon', 'MID', 'GHA', 21),
      p(28, 'Ziad Farag', 'MID', 'EGY', 24), p(30, 'Youssef Hamdi', 'MID', 'EGY', 27),
      p(null, 'Abdelrahman El Desouki', 'FWD', 'EGY', 26), p(null, 'Hesham Ramadan', 'FWD', 'EGY', 30), p(null, 'P. Tweneboah', 'FWD', 'GHA', 20),
      p(9, 'Mahmoud Abou-Gouda', 'FWD', 'EGY', 28), p(10, 'Mohamed Magdy', 'FWD', 'EGY', 29), p(29, 'Ali Hussein', 'FWD', 'EGY', 33),
      p(34, 'Khaled Rabiaa', 'FWD', 'EGY', 21), p(38, 'Mohamed Camara', 'FWD', 'GUI', 19)
    ]
  },
  {
    id: 'gouna', name: 'El Gouna FC', shortName: 'GOU', coach: { name: 'Alaa Abdelaal', nat: 'EGY', age: null }, complete: true,
    missing: 'Coach age not shown; #90 listed twice (Adham Karim, Wilfried Teukeu)',
    players: [
      p(1, 'Ahmed Masoud', 'GK', 'EGY', 34), p(16, 'Islam Reisha', 'GK', 'EGY', 29), p(26, 'Ziad Askar', 'GK', 'EGY', 25),
      p(99, 'Badreldin Walid', 'GK', 'EGY', 20),
      p(2, 'Abdel Gawad Taalab', 'DEF', 'EGY', 24), p(3, 'Khaled Ahmed', 'DEF', 'EGY', 23), p(4, 'Islam Abou Salima', 'DEF', 'EGY', 33),
      p(5, 'Saber El Shimi', 'DEF', 'EGY', 33), p(6, 'Ahmed Ghoneim', 'DEF', 'EGY', 27), p(20, 'Ahmed Belia', 'DEF', 'EGY', 26),
      p(21, 'Youssef Afifi', 'DEF', 'EGY', 25), p(28, 'Mostafa Metawea', 'DEF', 'EGY', 23), p(34, 'Marwan Essam', 'DEF', 'EGY', 21),
      p(35, 'Ahmed Sherif', 'DEF', 'EGY', 20), p(37, 'Hesham Wael', 'DEF', 'EGY', 21), p(44, 'Alpha Turay', 'DEF', 'SLE', 21),
      p(8, 'Reda Salah', 'MID', 'EGY', 28), p(10, 'Mohamed Mahmoud', 'MID', 'EGY', 28), p(12, 'Mahmoud Hassouna', 'MID', 'EGY', 29),
      p(13, 'Omar El Gazar', 'MID', 'EGY', 22), p(14, 'Nour El Sayed', 'MID', 'EGY', 42), p(27, 'Salah Zayed', 'MID', 'EGY', 25),
      p(33, 'David Simukonda', 'MID', 'ZAM', 21), p(42, 'Michael Egbemba', 'MID', 'CMR', 21), p(74, 'Zizo', 'MID', 'EGY', 25),
      p(90, 'Adham Karim', 'MID', 'EGY', 19), p(90, 'Wilfried Teukeu', 'MID', 'CMR', 21),
      p(7, 'Belal El Sayed', 'FWD', 'EGY', 26), p(9, 'Marwan Mohsen', 'FWD', 'EGY', 37), p(11, 'Ahmed Zaki', 'FWD', 'EGY', 24, true),
      p(19, 'Islam Hesham', 'FWD', 'EGY', 29), p(22, 'Mohamed Reda', 'FWD', 'EGY', 24), p(24, 'Ali El Zahdi', 'FWD', 'EGY', 30),
      p(29, 'Tolulope Samuel Ojo', 'FWD', 'NGA', 23), p(30, 'Alaa Shaaban', 'FWD', 'EGY', 26), p(70, 'Ahmed Gamal', 'FWD', 'EGY', 24)
    ]
  }
];
