export const MINIMUM_AGE = 18;
export const UNDER_21_MATCH_MAX_AGE = 22;
export const ADULT_MATCH_MIN_AGE = 23;
export const MAXIMUM_MATCH_AGE = 99;

export interface MatchAgeBounds {
  max: number;
  min: number;
}

export const getAge = (birthdayString: string) => {
  const birthDate = new Date(birthdayString);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthOffset = today.getMonth() - birthDate.getMonth();
  if (
    monthOffset < 0 ||
    (monthOffset === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age;
};

export const getMatchAgeBounds = (birthday: string): MatchAgeBounds => {
  const age = getAge(birthday);
  if (age !== null && age < 21) {
    return { max: UNDER_21_MATCH_MAX_AGE, min: MINIMUM_AGE };
  }
  return { max: MAXIMUM_MATCH_AGE, min: ADULT_MATCH_MIN_AGE };
};

export const isProtectedYoungAdult = (age: number) => age >= 18 && age <= 21;
