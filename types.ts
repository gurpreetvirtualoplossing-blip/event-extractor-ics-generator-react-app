
export interface EventDetails {
  title: string;
  startDate: string;
  endDate: string;
  location: string | null;
  description: string | null;
  recurrence: {
      frequency: 'daily' | 'weekly' | 'monthly';
      interval: number;
      byDay: string[];
      endStrategy: 'never' | 'after' | 'on_date';
      count: number | null;
      endDate: string | null;
  } | null;
}

// export enum AppMode {
//   SINGLE = 'single',
//   MULTIPLE = 'multiple'
// }

export enum FileType {
  IMAGE = 'image',
  SPREADSHEET = 'spreadsheet'
}
