
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

const PROFILE_GENDERS = [
    "male",
    "female",
    "non_binary",
    "self_described",
    "prefer_not_to_say",
];

const PARTNER_GENDERS = [
    "male",
    "female",
    "non_binary",
    "self_described",
];

function getValue(object, path) {
    return path.split(".").reduce(
        (value, key) => value?.[key],
        object
    );
}

function isFilled(value) {
    if (value === undefined || value === null) return false;

    if (typeof value === "string") {
        return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
        return value.length > 0;
    }

    return true;
}

function getRequiredFields(profile) {
    const fields = [...REQUIRED_FIELDS];

    // A custom gender description is required only for self_described.
    if (profile.basic?.gender === "self_described") {
        fields.push("basic.genderDescription");
    }

    return fields;
}

export function calculateCompletion(profile) {
    const requiredFields = getRequiredFields(profile);

    const filled = requiredFields.filter((path) =>
        isFilled(getValue(profile, path))
    ).length;

    return Math.round(
        (filled / requiredFields.length) * 100
    );
}

export function validateProfileForSubmission(profile) {
    const errors = [];

    const requiredFields = getRequiredFields(profile);

    // Required fields
    for (const path of requiredFields) {
        if (!isFilled(getValue(profile, path))) {
            errors.push(
                `${path.replaceAll(".", " ")} is required.`
            );
        }
    }

    // Validate profile gender.
    if (
        isFilled(profile.basic?.gender) &&
        !PROFILE_GENDERS.includes(profile.basic.gender)
    ) {
        errors.push("Please select a valid profile gender.");
    }

    // Validate custom gender description.
    if (profile.basic?.gender === "self_described") {
        const description = profile.basic?.genderDescription;

        if (
            typeof description !== "string" ||
            !description.trim()
        ) {
            errors.push(
                "Please describe your gender."
            );
        } else if (description.trim().length > 100) {
            errors.push(
                "Gender description cannot exceed 100 characters."
            );
        }
    }

    // Validate partner gender preferences.
    const preferredGenders =
        profile.partnerPreferences?.preferredGenders;

    if (
        preferredGenders !== undefined &&
        preferredGenders !== null
    ) {
        if (!Array.isArray(preferredGenders)) {
            errors.push(
                "Partner gender preferences must be a list."
            );
        } else {
            const invalidGenders = preferredGenders.filter(
                (gender) => !PARTNER_GENDERS.includes(gender)
            );

            if (invalidGenders.length > 0) {
                errors.push(
                    "One or more selected partner gender preferences are invalid."
                );
            }

            if (
                new Set(preferredGenders).size !==
                preferredGenders.length
            ) {
                errors.push(
                    "Duplicate partner gender preferences are not allowed."
                );
            }
        }
    }

    // Date of birth and age validation.
    const dob = profile.basic?.dateOfBirth
        ? new Date(profile.basic.dateOfBirth)
        : null;

    if (!dob || !Number.isFinite(dob.getTime())) {
        errors.push(
            "A valid date of birth is required."
        );
    } else {
        const today = new Date();

        let age =
            today.getFullYear() - dob.getFullYear();

        const beforeBirthday =
            today.getMonth() < dob.getMonth() ||
            (
                today.getMonth() === dob.getMonth() &&
                today.getDate() < dob.getDate()
            );

        if (beforeBirthday) age--;

        if (age < 18) {
            errors.push(
                "You must be at least 18 years old."
            );
        }

        if (age > 100) {
            errors.push(
                "Please check your date of birth."
            );
        }

        if (dob > today) {
            errors.push(
                "Date of birth cannot be in the future."
            );
        }
    }

    // Partner age range validation.
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

    // Partner height range validation.
    if (
        preferences.heightMinCm != null &&
        preferences.heightMaxCm != null &&
        preferences.heightMinCm > preferences.heightMaxCm
    ) {
        errors.push(
            "Maximum preferred height must be greater than or equal to minimum height."
        );
    }

    // Family validation.
    const family = profile.family || {};

    if (
        family.brothersMarried != null &&
        family.brothers != null &&
        family.brothersMarried > family.brothers
    ) {
        errors.push(
            "Married brothers cannot exceed total brothers."
        );
    }

    if (
        family.sistersMarried != null &&
        family.sisters != null &&
        family.sistersMarried > family.sisters
    ) {
        errors.push(
            "Married sisters cannot exceed total sisters."
        );
    }

    return errors;
}
