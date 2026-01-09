import { create } from "domain";
import { is } from "drizzle-orm";
import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  date,
  pgEnum,
  boolean,
  decimal,
  integer,
  text,
  primaryKey,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// Enum giới tính
export const genderEnum = pgEnum("gender", ["male", "female"]);
export const roleEnum = pgEnum("role_enum", [
  "admin",
  "customer",
  "staff",
  "system",
]);
export const typeEnum = pgEnum("type_enum", ["percent", "fixed"]);
export const kindEnum = pgEnum("kind_enum", ["general", "group"]);
export const statusEnum = pgEnum("status_enum", ["active", "disabled"]);
export const conversationTypesEnum = pgEnum("conversation_types", [
  "direct",
  "group",
]);
export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "confirmed",
  "rejected",
  "completed",
  "cancelled",
]);
export const groupOrderStatusEnum = pgEnum("group_order_status", [
  "pending",
  "locked",
  "ordering",
  "completed",
  "cancelled",
]);
export const messageTypesEnum = pgEnum("message_types", [
  "text",
  "image",
  "file",
  "system",
]);

// Enum phân loại media: ảnh hoặc video
export const reviewMediaTypeEnum = pgEnum("review_media_type", [
  "image",
  "video",
]);

// Enum quyền riêng tư bài đăng
export const postVisibilityEnum = pgEnum("post_visibility", [
  "public",
  "friends",
  "private",
]);

// Enum loại media trong bài đăng
export const postMediaTypeEnum = pgEnum("post_media_type", [
  "image",
  "video",
  "file",
]);

// Trạng thái kết bạn
export const friendStatusEnum = pgEnum("friend_status", [
  "pending", // đã gửi lời mời, chờ phản hồi
  "accepted", // đã chấp nhận
]);

// Loại thông báo
export const notificationTypeEnum = pgEnum("notification_type", [
  "friend_request", // Lời mời kết bạn
  "friend_accepted", // Chấp nhận kết bạn
  "post_like", // Thích bài viết
  "post_comment", // Bình luận bài viết
  "comment_reply", // Trả lời bình luận
  "comment_like", // Thích bình luận
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  fullName: varchar("full_name", { length: 120 }),
  phone: varchar("phone", { length: 20 }),
  gender: genderEnum("gender"),
  status: statusEnum("status_enum").notNull().default("active"),
  role: roleEnum("role").notNull().default("customer"),
  dateOfBirth: date("date_of_birth"),
  province: varchar("province", { length: 120 }),
  district: varchar("district", { length: 120 }),
  ward: varchar("ward", { length: 120 }),
  addressDetail: varchar("address_detail", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  parentId: uuid("parent_id").references(() => categories.id),
  name: varchar("name", { length: 102 }).notNull().unique(),
  sort: integer("sort").notNull().default(0),
});

// 1 category co nhieu san pham
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id").references(() => categories.id),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description"),
    price_default: decimal("price_default", {
      precision: 12,
      scale: 2,
    }).notNull(),
    stock: integer("stock").notNull().default(0),
    thumbnailPath: varchar("thumbnail_path"), // path trong bucket Supabase
    thumbnailUrl: varchar("thumbnail_url"), // public URL
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    idxProductCategory: index("idx_products_category_id").on(table.categoryId),
    idxProductCreatedAt: index("idx_products_created_at").on(table.createdAt),
  })
);

export const colors = pgTable(
  "colors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 20 }).notNull(),
    imagePath: varchar("image_path"), // path trong bucket Supabase
    imageUrl: varchar("image_url"), // public URL (nếu cần cache)
  },
  (table) => ({
    idxColorsProduct: index("idx_colors_product_id").on(table.productId),
    idxColorsProductName: index("idx_colors_product_name").on(
      table.productId,
      table.name
    ),
  })
);

export const sizes = pgTable(
  "sizes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 20 }).notNull(),
  },
  (table) => ({
    idxSizesProduct: index("idx_sizes_product_id").on(table.productId),
    idxSizesProductName: index("idx_sizes_product_name").on(
      table.productId,
      table.name
    ),
  })
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    colorId: uuid("color_id").references(() => colors.id, {
      onDelete: "cascade",
    }),
    sizeId: uuid("size_id").references(() => sizes.id, {
      onDelete: "cascade",
    }),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "cascade",
    }),
    stockKeepingUnit: varchar("sku", { length: 50 }).notNull(),
    stock: integer("stock").notNull().default(0),
    price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  },

  // ràng buộc không thể tạo variant trùng nhau
  (table) => {
    return {
      uqProductVariantColorSize: uniqueIndex(
        "uq_product_variant_color_size"
      ).on(table.productId, table.colorId, table.sizeId),
      idxVariantProduct: index("idx_variants_product_id").on(table.productId),
      idxVariantProductColor: index("idx_variants_product_color").on(
        table.productId,
        table.colorId
      ),
    };
  }
);

export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  description: text("description"),
  kind: kindEnum("kind").default("general"),
  type: typeEnum("type").default("fixed"),
  value: decimal("value", { precision: 12, scale: 2 }).notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  usage_limit: integer("usage_limit"), // tong so lan su dung
  used: integer("used").notNull().default(0), // da dung bao nhieu lan
  perUserLimit: integer("per_user_limit"), // so lan su dung tren 1 user
  minOrderTotal: decimal("min_order_total"), // gia tri don hang toi thieu de ap dung coupon
  // so luong thanh vien toi da
  maxMember: integer("max_member"),
});

export const couponProducts = pgTable(
  "coupon_products",
  {
    couponId: uuid("coupon_id")
      .notNull()
      .references(() => coupons.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
  },
  // 1 coupon có thể áp dụng cho nhiều sản phẩm, 1 sản phẩm có thể áp dụng với nhiều coupon
  (table) => ({
    pk: primaryKey({ columns: [table.couponId, table.productId] }),
    idxCouponProduct: index("idx_coupon_products_product_id").on(
      table.productId
    ),
  })
);

export const carts = pgTable("carts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
});

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id").references(() => carts.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    quantity: integer("quantity").notNull(),
  },
  // update quantity khi người dùng thêm variant đã có
  (table) => {
    return {
      upCartVariant: uniqueIndex("uq_cart_variant").on(
        table.cartId,
        table.variantId
      ),
    };
  }
);

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  groupOrderId: uuid("group_order_id").references(() => groupOrders.id, {
    onDelete: "set null",
  }),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentMethod: varchar("payment_method", { length: 10 }).default("COD"),
  // Cờ đánh dấu đã thanh toán tiền hay chưa
  isPaid: boolean("is_paid").default(false).notNull(),
  // Thời điểm thanh toán thành công
  paidAt: timestamp("paid_at", { withTimezone: true }),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(), // Tổng tiền trước giảm giá
  discountTotal: decimal("discount_total", { precision: 12, scale: 2 }).default(
    "0"
  ), // Tổng tiền giảm giá áp dụng
  shippingFee: decimal("shipping_fee", { precision: 12, scale: 2 }).default(
    "0"
  ), // Tiền ship

  couponCode: varchar("coupon_code", { length: 40 }), // snapshot mã coupon

  total: decimal("total", { precision: 12, scale: 2 }).notNull(), // Tổng tiền cần thanh toán

  // Thông tin giao hàng snapshot
  shippingName: varchar("shipping_name", { length: 120 }),
  shippingPhone: varchar("shipping_phone", { length: 20 }),
  province: varchar("province", { length: 120 }),
  district: varchar("district", { length: 120 }),
  ward: varchar("ward", { length: 120 }),
  addressDetail: varchar("address_detail", { length: 255 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id),
  variantId: uuid("variant_id").references(() => productVariants.id),
  productName: varchar("product_name", { length: 160 }).notNull(), // snapshot tên
  variantName: varchar("variant_name", { length: 80 }), // snapshot màu + size
  imagePath: varchar("image_path"), // path ảnh snapshot trong order-images/
  imageUrl: varchar("image_url"), // public URL để client render
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

// Thong tin nhom mua chung, status
export const groupOrders = pgTable("group_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id),
  couponId: uuid("coupon_id").references(() => coupons.id),
  creatorId: uuid("creator_id").references(() => users.id),
  targetMember: integer("target_member").notNull(), // so luong thanh vien muc tieu
  currentMember: integer("current_member").notNull().default(1), // so luong thanh vien hien tai
  status: groupOrderStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Chi tiết thành viên trong nhóm mua chung, chọn variant, qty
export const groupOrderMembers = pgTable(
  "group_order_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupOrderId: uuid("group_order_id")
      .notNull()
      .references(() => groupOrders.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    hasChosen: boolean("has_chosen").notNull().default(false), // da chon variant va qty chua
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    // rang buoc 1 user chi dc tham gia 1 lan trong 1 group order
  },
  (table) => {
    return {
      uqGroupOrderUser: uniqueIndex("uq_group_order_user").on(
        table.groupOrderId,
        table.userId
      ),
    };
  }
);

export const groupOrderMemberItems = pgTable(
  "group_order_member_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => groupOrderMembers.id, { onDelete: "cascade" }),

    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),

    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // 1 member chỉ có đúng 1 dòng cho mỗi variant
    uqMemberVariant: uniqueIndex("uq_member_variant").on(
      table.memberId,
      table.variantId
    ),
  })
);

// chat schema
export const inviteLinks = pgTable("invite_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  creatorId: uuid("creator_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "cascade",
  }),
  couponId: uuid("coupon_id").references(() => coupons.id, {
    onDelete: "cascade",
  }),
  isUsed: boolean("is_used").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  conversationId: uuid("conversation_id")
    .unique()
    .references(() => conversations.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// room chat (1-1, group)
export const conversations = pgTable("conversations", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: uuid("owner_id").references(() => users.id), // nguoi tao nhom
  groupOrderId: uuid("group_order_id").references(() => groupOrders.id, {
    onDelete: "set null",
  }), // neu la nhom mua chung
  type: conversationTypesEnum("conversation_types").notNull().default("direct"), // direct, group
  name: varchar("name", { length: 100 }), // ten nhom || null neu 1-1 || rename
  inviteToken: varchar("invite_token", { length: 255 }).unique(), // link moi nguoi vao nhom
  lastMessage: text("last_message"), // tin nhan moi nhat
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }), // thoi diem tin nhan moi nhat
  archived: boolean("archived").notNull().default(false), // co bi luu tru khong
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ai thuoc ve conversation nao
export const conversationMembers = pgTable(
  "conversation_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    // rang buoc 1 user chi dc tham gia 1 lan trong 1 conversation
  },
  (table) => {
    return {
      uqConversationUser: uniqueIndex("uq_conversation_user").on(
        table.conversationId,
        table.userId
      ),
    };
  }
);

// tin nhan trong conversation
export const messages = pgTable("messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  senderId: uuid("sender_id")
    .notNull()
    .references(() => users.id),
  content: text("content").notNull(),
  type: messageTypesEnum("type").notNull().default("text"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// thời điểm người dùng đọc tin nhắn trong conversation
export const messageReads = pgTable(
  "message_reads",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),

    // chỉ cần lưu thời điểm đọc cuối cùng
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.conversationId] }),
  })
);

// Đánh giá sản phẩm sau khi mua
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id),

    rating: integer("rating").default(5),
    comment: text("comment"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Ràng buộc: Mỗi order item chỉ được review 1 lần
    uniqueOrderItem: uniqueIndex("unique_review_per_order_item").on(
      table.orderItemId
    ),
  })
);

export const reviewMedia = pgTable("review_media", {
  id: uuid("id").defaultRandom().primaryKey(),

  reviewId: uuid("review_id")
    .notNull()
    .references(() => reviews.id, { onDelete: "cascade" }),

  type: reviewMediaTypeEnum("type").notNull().default("image"), // 'image' | 'video'
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Bài đăng
export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),

  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  content: text("content"), // caption / mô tả

  visibility: postVisibilityEnum("visibility").default("public").notNull(),

  isEdited: boolean("is_edited").default(false).notNull(),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  }, (table) => ({
    idxPostsAuthor: index("idx_posts_author_id").on(table.authorId),
  }));

export const postMedia = pgTable("post_media", {
  id: uuid("id").defaultRandom().primaryKey(),

  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),

  type: postMediaTypeEnum("type").notNull().default("image"), // image | video | file
  postFilePath: varchar("post_file_path", { length: 500 }),
  postFileUrl: varchar("post_file_url", { length: 500 }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  }, (table) => ({
    idxPostMediaPost: index("idx_post_media_post_id").on(table.postId),
  }));

export const postProducts = pgTable(
  "post_products",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),

    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.productId] }),
    idxPostProductsPost: index("idx_post_products_post_id").on(t.postId),
    idxPostProductsProduct: index("idx_post_products_product_id").on(t.productId),
  })
);

// Like, cmt bài viết
export const postLikes = pgTable(
  "post_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    // Mỗi user chỉ like 1 lần trên 1 bài viết
    uqPostLike: uniqueIndex("uq_post_like").on(table.postId, table.userId),
  })
);

export const postComments = pgTable("post_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => posts.id, { onDelete: "cascade" }),
  parentCommentId: uuid("parent_comment_id").references(
    () => postComments.id,
    { onDelete: "cascade" } // Xóa comment cha cũng xóa reply
  ), // Null nếu là bình luận chính, có ID nếu là reply
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  }, (table) => ({
    idxPostCommentsPost: index("idx_post_comments_post_id").on(table.postId),
    idxPostCommentsParent: index("idx_post_comments_parent_id").on(table.parentCommentId),
  }));

export const postCommentLikes = pgTable(
  "post_comment_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => postComments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    uqCommentLike: uniqueIndex("uq_comment_like").on(
      table.commentId,
      table.userId
    ),
  })
);

// Kết bạn giữa các user
// Lời moi kết bạn, trạng thái kết bạn
export const friendRequests = pgTable(
  "friend_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    status: friendStatusEnum("status").notNull().default("pending"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),

    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => ({
    // Không cho gửi trùng request
    uqFriendRequest: uniqueIndex("uq_friend_request").on(
      t.senderId,
      t.receiverId
    ),
  })
);

// Danh sách bạn bè
export const friendships = pgTable(
  "friendships",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    friendId: uuid("friend_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
  })
);

// Thông báo
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Người nhận thông báo
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Loại thông báo
  type: notificationTypeEnum("type").notNull(),

  // Tiêu đề & nội dung
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content"),

  // Người/Entity liên quan
  relatedUserId: uuid("related_user_id").references(() => users.id, {
    onDelete: "set null",
  }), // Ai gửi kết bạn, ai like, ai comment, etc.

  relatedEntityType: varchar("related_entity_type", { length: 50 }), // post, order, friend_request
  relatedEntityId: uuid("related_entity_id"), // ID của post, order, friendRequest

  // Link để navigate
  actionUrl: varchar("action_url", { length: 500 }),

  // Trạng thái đã đọc
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
