
const REQUIRED_FIELDS = [
    "basic.fullName",
    "basic.gender",
    "basic.dateOfBirth",
    "basic.heightCm",
    "basic.maritalStatus",
    "basic.motherTongue",

    "location.country",
    "location.state",
    "location.district",
    "location.city",

    "education.educationLevel",
    "education.qualification",

    "career.occupation",
    "career.employmentType",

    "family.fatherOccupation",
    "family.motherOccupation",
    "family.familyType",

    "lifestyle.diet",
    "introduction",

    "partnerPreferences.ageMin",
    "partnerPreferences.ageMax",
];

function getValue(object, path) {
    return path.split(".").reduce(
        (value, key) => value?.[key],
        object
    );
}

function isFilled(value) {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

export function calculateCompletion(profile) {
    const filled = REQUIRED_FIELDS.filter((path) =>
        isFilled(getValue(profile, path))
    ).length;

    return Math.round((filled / REQUIRED_FIELDS.length) * 100);
}

export function validateProfileForSubmission(profile) {
    const errors = [];

    for (const path of REQUIRED_FIELDS) {
        if (!isFilled(getValue(profile, path))) {
            errors.push(`${path.replaceAll(".", " ")} is required.`);
        }
    }

    const dob = profile.basic?.dateOfBirth
        ? new Date(profile.basic.dateOfBirth)
        : null;

    if (!dob || !Number.isFinite(dob.getTime())) {
        errors.push("A valid date of birth is required.");
    } else {
        const today = new Date();

        let age = today.getFullYear() - dob.getFullYear();

        const beforeBirthday =
            today.getMonth() < dob.getMonth() ||
            (
                today.getMonth() === dob.getMonth() &&
                today.getDate() < dob.getDate()
            );

        if (beforeBirthday) age--;

        if (age < 18) {
            errors.push("You must be at least 18 years old.");
        }

        if (dob > today) {
            errors.push("Date of birth cannot be in the future.");
        }
    }

    const preferences = profile.partnerPreferences || {};

    if (
        preferences.ageMin != null &&
        preferences.ageMax != null &&
        preferences.ageMin > preferences.ageMax
    ) {
        errors.push(
            "Maximum preferred age must be greater than or equal to minimum age."
        );
    }

    if (
        preferences.heightMinCm != null &&
        preferences.heightMaxCm != null &&
        preferences.heightMinCm > preferences.heightMaxCm
    ) {
        errors.push(
            "Maximum preferred height must be greater than or equal to minimum height."
        );
    }

    const family = profile.family || {};

    if (
        family.brothersMarried != null &&
        family.brothers != null &&
        family.brothersMarried > family.brothers
    ) {
        errors.push("Married brothers cannot exceed total brothers.");
    }

    if (
        family.sistersMarried != null &&
        family.sisters != null &&
        family.sistersMarried > family.sisters
    ) {
        errors.push("Married sisters cannot exceed total sisters.");
    }

    return errors;
}
