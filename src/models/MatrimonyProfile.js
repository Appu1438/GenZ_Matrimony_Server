
import mongoose from "mongoose";

const { Schema } = mongoose;

const photoSchema = new Schema(
    {
        url: { type: String, trim: true },
        publicId: { type: String, trim: true },
    },
    { _id: false }
);

const birthDetailsSchema = new Schema(
    {
        time: { type: String, trim: true },
        place: { type: String, trim: true },
        star: { type: String, trim: true },
        rashi: { type: String, trim: true },
        horoscopeAvailable: { type: Boolean, default: false },
        dosham: {
            type: String,
            enum: ["Yes", "No", "Not sure", "Prefer not to say"],
            default: "Prefer not to say",
        },
    },
    { _id: false }
);

const matrimonyProfileSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        // Who is creating this profile?
        profileFor: {
            type: String,
            enum: [
                "Self",
                "Son",
                "Daughter",
                "Brother",
                "Sister",
                "Relative",
                "Friend",
            ],
            default: "Self",
        },

        basic: {
            fullName: {
                type: String,
                trim: true,
                maxlength: 100,
            },

            // Gender identity of the person whose profile is being created.
            gender: {
                type: String,
                enum: [
                    "male",
                    "female",
                    "non_binary",
                    "self_described",
                    "prefer_not_to_say",
                ],
            },

            // Required by application validation when gender is self_described.
            genderDescription: {
                type: String,
                trim: true,
                maxlength: 100,
            },

            dateOfBirth: Date,

            heightCm: {
                type: Number,
                min: 100,
                max: 250,
            },

            maritalStatus: {
                type: String,
                enum: [
                    "Never married",
                    "Divorced",
                    "Widowed",
                    "Awaiting divorce",
                ],
            },

            motherTongue: {
                type: String,
                trim: true,
            },

            languagesKnown: [
                {
                    type: String,
                    trim: true,
                },
            ],

            religion: {
                type: String,
                trim: true,
            },

            community: {
                type: String,
                trim: true,
            },

            subCommunity: {
                type: String,
                trim: true,
            },

            birthDetails: {
                type: birthDetailsSchema,
                default: () => ({}),
            },
        },

        location: {
            country: {
                type: String,
                trim: true,
            },

            state: {
                type: String,
                trim: true,
            },

            district: {
                type: String,
                trim: true,
            },

            city: {
                type: String,
                trim: true,
            },

            nationality: {
                type: String,
                trim: true,
            },

            nativePlace: {
                type: String,
                trim: true,
            },

            grewUpIn: {
                type: String,
                trim: true,
            },

            willingToRelocate: {
                type: String,
                enum: ["Yes", "No", "Depends"],
                default: "Depends",
            },
        },

        education: {
            educationLevel: {
                type: String,
                trim: true,
            },

            qualification: {
                type: String,
                trim: true,
            },

            specialization: {
                type: String,
                trim: true,
            },

            institution: {
                type: String,
                trim: true,
            },

            graduationYear: {
                type: Number,
                min: 1950,
                max: 2100,
            },
        },

        career: {
            occupation: {
                type: String,
                trim: true,
            },

            jobTitle: {
                type: String,
                trim: true,
            },

            organisation: {
                type: String,
                trim: true,
            },

            employmentType: {
                type: String,
                trim: true,
            },

            annualIncome: {
                type: Number,
                min: 0,
            },

            currency: {
                type: String,
                default: "INR",
                maxlength: 3,
            },

            workCountry: {
                type: String,
                trim: true,
            },

            workCity: {
                type: String,
                trim: true,
            },
        },

        family: {
            fatherOccupation: {
                type: String,
                trim: true,
            },

            motherOccupation: {
                type: String,
                trim: true,
            },

            brothers: {
                type: Number,
                min: 0,
                max: 20,
            },

            brothersMarried: {
                type: Number,
                min: 0,
                max: 20,
            },

            sisters: {
                type: Number,
                min: 0,
                max: 20,
            },

            sistersMarried: {
                type: Number,
                min: 0,
                max: 20,
            },

            familyType: {
                type: String,
                enum: ["Nuclear", "Joint", "Extended"],
            },

            familyStatus: {
                type: String,
                trim: true,
            },

            familyValues: {
                type: String,
                enum: [
                    "Traditional",
                    "Moderate",
                    "Liberal",
                    "Other",
                ],
            },

            familyLocation: {
                type: String,
                trim: true,
            },
        },

        lifestyle: {
            diet: {
                type: String,
                trim: true,
            },

            smoking: {
                type: String,
                trim: true,
            },

            drinking: {
                type: String,
                trim: true,
            },

            hobbies: [
                {
                    type: String,
                    trim: true,
                    maxlength: 50,
                },
            ],

            interests: [
                {
                    type: String,
                    trim: true,
                    maxlength: 50,
                },
            ],

            personality: {
                type: String,
                trim: true,
                maxlength: 500,
            },
        },

        introduction: {
            type: String,
            trim: true,
            maxlength: 1000,
        },

        partnerPreferences: {
            ageMin: {
                type: Number,
                min: 18,
                max: 100,
            },

            ageMax: {
                type: Number,
                min: 18,
                max: 100,
            },

            heightMinCm: {
                type: Number,
                min: 100,
                max: 250,
            },

            heightMaxCm: {
                type: Number,
                min: 100,
                max: 250,
            },

            // Multiple partner gender preferences are supported.
            // An empty array means no gender restriction.
            preferredGenders: {
                type: [
                    {
                        type: String,
                        enum: [
                            "male",
                            "female",
                            "non_binary",
                            "self_described",
                        ],
                    },
                ],
                default: [],
            },

            maritalStatuses: [
                {
                    type: String,
                    trim: true,
                },
            ],

            religions: [
                {
                    type: String,
                    trim: true,
                },
            ],

            communities: [
                {
                    type: String,
                    trim: true,
                },
            ],

            motherTongues: [
                {
                    type: String,
                    trim: true,
                },
            ],

            educationLevels: [
                {
                    type: String,
                    trim: true,
                },
            ],

            occupations: [
                {
                    type: String,
                    trim: true,
                },
            ],

            employmentTypes: [
                {
                    type: String,
                    trim: true,
                },
            ],

            incomeMin: {
                type: Number,
                min: 0,
            },

            countries: [
                {
                    type: String,
                    trim: true,
                },
            ],

            states: [
                {
                    type: String,
                    trim: true,
                },
            ],

            cities: [
                {
                    type: String,
                    trim: true,
                },
            ],

            diets: [
                {
                    type: String,
                    trim: true,
                },
            ],

            smokingPreferences: [
                {
                    type: String,
                    trim: true,
                },
            ],

            drinkingPreferences: [
                {
                    type: String,
                    trim: true,
                },
            ],

            willingToRelocate: {
                type: String,
                enum: ["Yes", "No", "Doesn't matter"],
                default: "Doesn't matter",
            },

            additionalExpectations: {
                type: String,
                trim: true,
                maxlength: 1000,
            },
        },

        photos: {
            profilePhoto: {
                type: photoSchema,
                default: null,
            },

            gallery: {
                type: [photoSchema],
                default: [],
            },
        },

        currentStep: {
            type: Number,
            default: 0,
            min: 0,
            max: 6,
        },

        completionPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },

        status: {
            type: String,
            enum: [
                "draft",
                "pending_review",
                "needs_changes",
                "approved",
                "rejected",
            ],
            default: "draft",
            index: true,
        },

        reviewNote: {
            type: String,
            default: "",
            maxlength: 1000,
        },

        reviewedBy: {
            type: Schema.Types.ObjectId,
            ref: "Admin",
            default: null,
        },

        reviewedAt: {
            type: Date,
            default: null,
        },

        submittedAt: {
            type: Date,
            default: null,
        },

        approvedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

// Indexes
matrimonyProfileSchema.index({
    status: 1,
    "basic.gender": 1,
});

matrimonyProfileSchema.index({
    status: 1,
    "location.country": 1,
    "location.state": 1,
});

matrimonyProfileSchema.index({
    status: 1,
    "basic.religion": 1,
    "basic.community": 1,
});

export default mongoose.model(
    "MatrimonyProfile",
    matrimonyProfileSchema
);
