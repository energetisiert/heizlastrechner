export type Zugriffsstatus = {
  status: 'anonym' | 'pending' | 'approved' | 'rejected';
  hat_zugriff?: boolean;
};
