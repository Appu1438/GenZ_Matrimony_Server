
const PROFILE_FIELDS = {
    profileFor: true,

    basic: [
        "fullName",
        "gender",
        "genderDescription",
        "dateOfBirth",
        "heightCm",
        "maritalStatus",
        "motherTongue",
        "languagesKnown",
        "religion",
        "community",
        "subCommunity",
        "birthDetails",
    ],

    location: [
        "country",
        "state",
        "district",
        "city",
        "nationality",
        "nativePlace",
        "grewUpIn",
        "willingToRelocate",
    ],

    education: [
        "educationLevel",
        "qualification",
        "specialization",
        "institution",
        "graduationYear",
    ],

    career: [
        "occupation",
        "jobTitle",
        "organisation",
        "employmentType",
        "annualIncome",
        "currency",
        "workCountry",
        "workCity",
    ],

    family: [
        "fatherOccupation",
        "motherOccupation",
        "brothers",
        "brothersMarried",
        "sisters",
        "sistersMarried",
        "familyType",
        "familyStatus",
        "familyValues",
        "familyLocation",
    ],

    lifestyle: [
        "diet",
        "smoking",
        "drinking",
        "hobbies",
        "interests",
        "personality",
    ],

    partnerPreferences: [
        "ageMin",
        "ageMax",
        "heightMinCm",
        "heightMaxCm",
        "preferredGenders",
        "maritalStatuses",
        "religions",
        "communities",
        "motherTongues",
        "educationLevels",
        "occupations",
        "employmentTypes",
        "incomeMin",
        "countries",
        "states",
        "cities",
        "diets",
        "smokingPreferences",
        "drinkingPreferences",
        "willingToRelocate",
        "additionalExpectations",
    ],
};

const ARRAY_FIELDS = new Set([
    "languagesKnown",
    "hobbies",
    "interests",
    "preferredGenders",
    "maritalStatuses",
    "religions",
    "communities",
    "motherTongues",
    "educationLevels",
    "occupations",
    "employmentTypes",
    "countries",
    "states",
    "cities",
    "diets",
    "smokingPreferences",
    "drinkingPreferences",
]);

const NUMBER_FIELDS = new Set([
    "heightCm",
    "ageMin",
    "ageMax",
    "heightMinCm",
    "heightMaxCm",
    "incomeMin",
    "annualIncome",
    "graduationYear",
    "brothers",
    "brothersMarried",
    "sisters",
    "sistersMarried",
]);

function cleanValue(key, value) {
    if (value === undefined) return undefined;

    if (ARRAY_FIELDS.has(key)) {
        if (!Array.isArray(value)) return [];

        return value
            .map((item) => String(item).trim())
            .filter(Boolean)
            .slice(0, 100);
    }

    if (NUMBER_FIELDS.has(key)) {
        if (value === "" || value === null) {
            return undefined;
        }

        const number = Number(value);

        return Number.isFinite(number)
            ? number
            : undefined;
    }

    if (typeof value === "string") {
        return value.trim();
    }

    return value;
}

function pickNested(source, allowedFields) {
    if (
        !source ||
        typeof source !== "object" ||
        Array.isArray(source)
    ) {
        return {};
    }

    const result = {};

    for (const key of allowedFields) {
        if (
            !Object.prototype.hasOwnProperty.call(
                source,
                key
            )
        ) {
            continue;
        }

        if (key === "birthDetails") {
            const birth = source.birthDetails;

            if (
                !birth ||
                typeof birth !== "object" ||
                Array.isArray(birth)
            ) {
                continue;
            }

            result.birthDetails = {};

            for (const birthKey of [
                "time",
                "place",
                "star",
                "rashi",
                "horoscopeAvailable",
                "dosham",
            ]) {
                if (
                    Object.prototype.hasOwnProperty.call(
                        birth,
                        birthKey
                    )
                ) {
                    result.birthDetails[birthKey] =
                        cleanValue(
                            birthKey,
                            birth[birthKey]
                        );
                }
            }

            continue;
        }

        result[key] = cleanValue(
            key,
            source[key]
        );
    }

    return result;
}

export function pickProfilePayload(body = {}) {
    const payload = {};

    if (
        Object.prototype.hasOwnProperty.call(
            body,
            "profileFor"
        )
    ) {
        payload.profileFor = cleanValue(
            "profileFor",
            body.profileFor
        );
    }

    for (const [group, fields] of Object.entries(
        PROFILE_FIELDS
    )) {
        if (Array.isArray(fields)) {
            payload[group] = pickNested(
                body[group],
                fields
            );
        }
    }

    if (
        Object.prototype.hasOwnProperty.call(
            body,
            "introduction"
        )
    ) {
        payload.introduction = cleanValue(
            "introduction",
            body.introduction
        );
    }

    if (
        Object.prototype.hasOwnProperty.call(
            body,
            "currentStep"
        )
    ) {
        const step = Number(body.currentStep);

        if (Number.isInteger(step)) {
            payload.currentStep = Math.min(
                6,
                Math.max(0, step)
            );
        }
    }

    // Photos are deliberately excluded.
    // Add photos only through a secure upload endpoint
    // that verifies the uploaded file and its ownership.

    return payload;
}

export function mergeProfile(profile, payload) {
    for (const [key, value] of Object.entries(payload)) {
        if (
            value &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            key !== "birthDetails"
        ) {
            const existing = profile[key]?.toObject
                ? profile[key].toObject()
                : profile[key] || {};

            profile[key] = {
                ...existing,
                ...value,
            };
        } else if (key === "currentStep") {
            profile.currentStep = value;
        } else {
            profile[key] = value;
        }
    }

    return profile;
}
