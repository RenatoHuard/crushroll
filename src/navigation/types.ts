export type RootStackParamList = {
  CrushList: undefined;
  CrushDetail: { crushId: string };
  CrushForm: { crushId?: string; returnToDate?: boolean } | undefined;
  DateForm: { crushId?: string; dateId?: string } | undefined;
  Profile: undefined;
};
