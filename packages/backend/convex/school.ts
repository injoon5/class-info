// `code` is the NEIS 표준학교코드. It also disambiguates the school by name:
// 양정고등학교 exists in both Seoul (7010208) and Busan (7150152), and the
// timetable API resolves a duplicate name to the first row rather than asking.
export const SCHOOL = {
  code: "7010208",
  grade: 1,
  classno: 3,
} as const;
