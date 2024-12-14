import {z, ZodType} from "zod";

export class StudentValidation {
  static readonly SIGNUP: ZodType = z.object({
    firstName: z.string().max(100),
    lastName: z.string().max(100),
    email: z.string().email(),
    password: z.string().min(5).max(50),
  });

  static readonly SIGNIN: ZodType = z.object({
    email: z.string().email(),
    password: z.string().min(5).max(20),
    fcmToken: z.string().optional(),
  });

  static readonly UpdateStudentProfile: ZodType = z.object({
    lastName: z.string().min(1).optional(),
    shortBio: z.string().min(5).optional(),
    phoneNumber: z.string().min(3).max(20).optional(),
    firstName: z.string().min(1).max(20).optional(),
    country: z.string().max(40).min(1).optional(),
    languages: z.array(z.string()).nonempty().optional(),
    grade: z.number().optional(),
  });

  static readonly GetAllVideos: ZodType = z.object({
    page: z.number().min(1).positive(),
    size: z.number().min(1).max(100).positive(),
  });

  static readonly GetVideosByList: ZodType = z.object({
    limit: z.number().min(1).positive().max(10),
    videoIds: z.array(z.string()).nonempty(),
  });

  static readonly GetVideosByTutorId = z.object({
    lawyerID: z.string().min(1).max(100),
    page: z.number().min(1).positive(),
    size: z.number().min(1).max(100).positive(),
  });

  static readonly GetCourseByList: ZodType = z.object({
    limit: z.number().min(1).max(10),
    courseIds: z.array(z.string()).nonempty(),
  });

  static readonly GetReactionByList: ZodType = z.object({
    limit: z.number().min(1).max(10),
    reactionIds: z.array(z.string()).nonempty(),
  });

  static readonly VideoSchema: ZodType = z.object({
    nQuiz: z.number(),
    thumbnail: z.string(),
    title: z.string(),
  });

  static readonly CourseSchema: ZodType = z.object({
    idCreator: z.string(),
    nQuiz: z.number(),
    thumbnailCourse: z.string(),
    thumbnailCreator: z.string(),
    title: z.string(),
  });

  static readonly UpdateStudentCl: ZodType = z.object({
    updateVideo: z.record(this.VideoSchema).optional(),
    updateCourse: z.record(this.CourseSchema).optional(),
    idCollection: z.string(),
    color: z.string(),
    nItems: z.number(),
    page: z.number(),
    deleteVideo: z.array(z.string()).nonempty().optional(),
    deleteCourse: z.array(z.string()).nonempty().optional(),
    title: z.string(),
  });

  static readonly HistroryVideos: ZodType = z.object({
    cId: z.string().min(1).nullable(),
    emo: z.array(z.number()),
    qz: z.array(z.number()),
    sh: z.boolean(),
    v: z.number().min(1),
    wt: z.boolean(),
  });

  static readonly UpdateHistoryVideos: ZodType = z
    .record(z.string(), this.HistroryVideos)
    .superRefine((data, ctx) => {
      const keys = Object.keys(data);
      if (keys.length > 30) {
        ctx.addIssue({
          code: "custom",
          message: "A maximum of 30 objects is allowed.",
        });
      }
    });

  // ------------Update multiple data------------------
  static readonly updateVideoSchema: ZodType = z.record(this.VideoSchema);
  static readonly updateCourseSchema: ZodType = z.record(this.CourseSchema);
  static readonly collection: ZodType = z.object({
    updateVideo: this.updateVideoSchema.optional(),
    updateCourse: this.updateCourseSchema.optional(),
    deleteCourse: z.array(z.string()).nonempty().optional(),
    deleteVideo: z.array(z.string()).nonempty().optional(),
    color: z.string(),
    nItems: z.number(),
    page: z.number(),
    title: z.string(),
  });

  static readonly MultipleUpdateCollections: ZodType = z
    .record(z.string(), this.collection)
    .superRefine((data, ctx) => {
      const keys = Object.keys(data);
      if (keys.length > 30) {
        ctx.addIssue({
          code: "custom",
          message: "A maximum of 30 objects is allowed.",
        });
      }
    });

  static readonly UpdateReactionVideos: ZodType = z.object({
    emojis: z.array(z.number()).optional(),
    idReaction: z.string().min(1),
  });

  static readonly GetTutorsByList: ZodType = z.object({
    limit: z.number().max(10),
    tutorIds: z.array(z.string()).nonempty().max(10),
  });

  static readonly SearchVideo: ZodType = z.object({
    subject: z.string().min(1).optional(),
    topics: z.array(z.string().optional()).max(3).optional(),
    grade: z.number().positive().optional(),
    language: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    size: z.number().min(1).max(100).positive().optional(),
    page: z.number().min(1).positive().optional(),
  });

  static readonly GetFlashCardsByList: ZodType = z.object({
    limit: z.number().max(10),
    fcIds: z.array(z.string()).nonempty().max(10),
  });

  static readonly historyFcShema = z.object({
    fl: z.number().int(),
    ud: z.array(z.union([z.literal(0), z.literal(1), z.literal(2)])),
  });

  static readonly UpdateHistoryFlashCards: ZodType = z
    .record(z.string(), this.historyFcShema)
    .superRefine((data, ctx) => {
      const keys = Object.keys(data);
      if (keys.length > 30) {
        ctx.addIssue({
          code: "custom",
          message: "A maximum of 30 objects is allowed.",
        });
      }
    });

  static readonly lastFCSchema = z.object({
    title: z.string().min(1),
    subject: z.string().min(1),
    language: z.string().min(1),
    country: z.string(),
    topics: z.array(z.string()).nonempty(),
    grades: z.array(z.number().min(0).positive()).nonempty(),
    flashLength: z.number(),
    leftSide: z.number(),
    rightSide: z.number(),
  });

  static readonly UpdateLastFlashCards: ZodType = z
    .record(z.string(), this.lastFCSchema)
    .superRefine((data, ctx) => {
      const keys = Object.keys(data);
      if (keys.length > 30) {
        ctx.addIssue({
          code: "custom",
          message: "A maximum of 30 objects is allowed.",
        });
      }
    });

  static readonly RecomedationVideosCountrySchema: ZodType = z.object({
    language: z.string(),
    grade: z.number(),
    subject: z.string(),
    country: z.string(),
  });

  static readonly GetRecomendationVideosCountry: ZodType = z.object({
    subject_group: z
      .array(this.RecomedationVideosCountrySchema)
      .max(10)
      .nonempty(),
  });
  static readonly RecomedationVideosSubjectSchema: ZodType = z.object({
    language: z.string(),
    grade: z.number(),
    subject: z.string(),
  });

  static readonly GetRecomendationVideosSubject: ZodType = z.object({
    subject_group: z
      .array(this.RecomedationVideosSubjectSchema)
      .max(10)
      .nonempty(),
  });

  // ------------------------
  static readonly CollectionFc: ZodType = z.object({
    ct: z.boolean().optional(),
    tl: z.string(),
    cl: z.number(),
    bk: z.boolean(),
    sz: z.number(),
    ls: z.number(),
    rs: z.number(),
    updatePc: z
      .record(
        z.string(),
        z.object({
          cr: z.string(),
          lg: z.string(),
          gd: z.array(z.number()),
          sz: z.number(),
          tl: z.string(),
          tp: z.array(z.string()),
          sj: z.string(),
        })
      )
      .optional(),
    deletePc: z.array(z.string()).optional(),
  });

  static readonly UpdateCollectionFlashcards: ZodType = z
    .record(z.string(), this.CollectionFc)
    .superRefine((data, ctx) => {
      const keys = Object.keys(data);
      if (keys.length > 30) {
        ctx.addIssue({
          code: "custom",
          message: "A maximum of 30 objects is allowed.",
        });
      }
    });

  static readonly UpdateMultipleCollectionStudent: ZodType = z.object({
    collectionFlashcards: this.UpdateCollectionFlashcards.optional(),
    collectionVideos: this.MultipleUpdateCollections.optional(),
    lastFlashcards: this.UpdateLastFlashCards.optional(),
    historyFlashcards: this.UpdateHistoryFlashCards.optional(),
    historyVideos: this.UpdateHistoryVideos.optional(),
    followings: z.array(z.string()).optional(),
  });
}
