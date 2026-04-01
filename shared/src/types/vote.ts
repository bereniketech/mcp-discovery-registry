export interface Vote {
  id: string;
  userId: string;
  serverId: string;
  value: 1 | -1;
  createdAt: string;
}
