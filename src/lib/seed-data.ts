import type {
  Team, User, DataSource, Dataset, DataContract, SchemaField, ContractRule,
  DownstreamAsset, LineageEdge, ValidationRun, ValidationIssue, SchemaChange,
  ChangeRequest, Incident, AuditLog, ComplianceTrendPoint, DataQualityTrendPoint,
  Comment, ActivityEntry,
} from "./types";

function id(prefix: string, n: number): string {
  return `${prefix}_${String(n).padStart(3, "0")}`;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// ==================== Teams ====================
export function seedTeams(): Team[] {
  return [
    { id: "team_001", name: "Platform Data", description: "Core data platform and infrastructure", color: "#3b82f6", createdAt: daysAgo(120) },
    { id: "team_002", name: "Growth Analytics", description: "User acquisition and growth metrics", color: "#10b981", createdAt: daysAgo(120) },
    { id: "team_003", name: "Finance Engineering", description: "Financial data and reporting pipelines", color: "#f59e0b", createdAt: daysAgo(120) },
    { id: "team_004", name: "ML & AI", description: "Machine learning features and model pipelines", color: "#ef4444", createdAt: daysAgo(120) },
    { id: "team_005", name: "Customer Insights", description: "Customer behavior and support analytics", color: "#8b5cf6", createdAt: daysAgo(120) },
  ];
}

// ==================== Users ====================
export function seedUsers(): User[] {
  return [
    { id: "user_001", email: "demo@contractguardian.io", name: "Demo Admin", role: "admin", teamId: "team_001", avatar: "DA", createdAt: daysAgo(120) },
    { id: "user_002", email: "sarah.chen@company.com", name: "Sarah Chen", role: "data_owner", teamId: "team_001", avatar: "SC", createdAt: daysAgo(100) },
    { id: "user_003", email: "marcus.lee@company.com", name: "Marcus Lee", role: "data_owner", teamId: "team_002", avatar: "ML", createdAt: daysAgo(95) },
    { id: "user_004", email: "priya.patel@company.com", name: "Priya Patel", role: "analyst", teamId: "team_003", avatar: "PP", createdAt: daysAgo(90) },
    { id: "user_005", email: "james.wilson@company.com", name: "James Wilson", role: "analyst", teamId: "team_004", avatar: "JW", createdAt: daysAgo(85) },
    { id: "user_006", email: "elena.garcia@company.com", name: "Elena Garcia", role: "data_owner", teamId: "team_005", avatar: "EG", createdAt: daysAgo(80) },
    { id: "user_007", email: "tom.anderson@company.com", name: "Tom Anderson", role: "viewer", teamId: "team_002", avatar: "TA", createdAt: daysAgo(60) },
    { id: "user_008", email: "lisa.zhang@company.com", name: "Lisa Zhang", role: "analyst", teamId: "team_001", avatar: "LZ", createdAt: daysAgo(55) },
  ];
}

// ==================== Data Sources ====================
export function seedDataSources(): DataSource[] {
  return [
    { id: "ds_001", name: "PostgreSQL Production", sourceType: "postgresql", connectionDetails: "prod-db.internal:5432", teamId: "team_001", createdAt: daysAgo(100) },
    { id: "ds_002", name: "Stripe API", sourceType: "api", connectionDetails: "api.stripe.com/v1", teamId: "team_003", createdAt: daysAgo(100) },
    { id: "ds_003", name: "Segment Events", sourceType: "event_stream", connectionDetails: "cdn.segment.com", teamId: "team_002", createdAt: daysAgo(100) },
    { id: "ds_004", name: "Salesforce CRM", sourceType: "api", connectionDetails: "api.salesforce.com", teamId: "team_005", createdAt: daysAgo(100) },
    { id: "ds_005", name: "Kafka Events Stream", sourceType: "kafka", connectionDetails: "kafka.internal:9092", teamId: "team_001", createdAt: daysAgo(100) },
    { id: "ds_006", name: "Snowflake Warehouse", sourceType: "snowflake", connectionDetails: "xy12345.snowflakecomputing.com", teamId: "team_001", createdAt: daysAgo(100) },
  ];
}

// ==================== Schema Fields ====================
function makeField(
  name: string, dataType: SchemaField["dataType"], required: boolean,
  opts: Partial<SchemaField> = {}
): SchemaField {
  return {
    id: `sf_${name}_${Math.random().toString(36).slice(2, 8)}`,
    name, dataType, required,
    isPrimaryKey: opts.isPrimaryKey ?? false,
    enumValues: opts.enumValues ?? [],
    nullRateThreshold: opts.nullRateThreshold ?? (required ? 0 : 5),
    numericMin: opts.numericMin ?? null,
    numericMax: opts.numericMax ?? null,
    regexPattern: opts.regexPattern ?? "",
    description: opts.description ?? "",
  };
}

// ==================== Datasets ====================
export function seedDatasets(): Dataset[] {
  return [
    { id: "dataset_001", name: "user_events", description: "Raw user interaction events from web and mobile apps", sourceId: "ds_003", teamId: "team_002", classification: "internal", freshnessSlaHours: 6, volumeThresholdPercent: 25, tags: ["events", "user", "tracking"], createdAt: daysAgo(90), updatedAt: daysAgo(2) },
    { id: "dataset_002", name: "orders", description: "E-commerce order records with line items", sourceId: "ds_001", teamId: "team_003", classification: "confidential", freshnessSlaHours: 12, volumeThresholdPercent: 20, tags: ["orders", "revenue", "ecommerce"], createdAt: daysAgo(85), updatedAt: daysAgo(5) },
    { id: "dataset_003", name: "customers", description: "Customer master data with PII fields", sourceId: "ds_004", teamId: "team_005", classification: "pii", freshnessSlaHours: 24, volumeThresholdPercent: 15, tags: ["customers", "crm", "pii"], createdAt: daysAgo(80), updatedAt: daysAgo(3) },
    { id: "dataset_004", name: "payments", description: "Payment transaction records from Stripe", sourceId: "ds_002", teamId: "team_003", classification: "confidential", freshnessSlaHours: 6, volumeThresholdPercent: 30, tags: ["payments", "stripe", "finance"], createdAt: daysAgo(75), updatedAt: daysAgo(1) },
    { id: "dataset_005", name: "ml_features_user_engagement", description: "User engagement feature store for ML models", sourceId: "ds_005", teamId: "team_004", classification: "internal", freshnessSlaHours: 4, volumeThresholdPercent: 35, tags: ["ml", "features", "engagement"], createdAt: daysAgo(70), updatedAt: daysAgo(4) },
    { id: "dataset_006", name: "products", description: "Product catalog with pricing and inventory", sourceId: "ds_001", teamId: "team_001", classification: "internal", freshnessSlaHours: 48, volumeThresholdPercent: 10, tags: ["products", "catalog"], createdAt: daysAgo(65), updatedAt: daysAgo(7) },
    { id: "dataset_007", name: "marketing_campaigns", description: "Marketing campaign performance metrics", sourceId: "ds_003", teamId: "team_002", classification: "internal", freshnessSlaHours: 24, volumeThresholdPercent: 25, tags: ["marketing", "campaigns"], createdAt: daysAgo(60), updatedAt: daysAgo(6) },
    { id: "dataset_008", name: "support_tickets", description: "Customer support ticket records", sourceId: "ds_004", teamId: "team_005", classification: "confidential", freshnessSlaHours: 12, volumeThresholdPercent: 20, tags: ["support", "tickets"], createdAt: daysAgo(55), updatedAt: daysAgo(2) },
    { id: "dataset_009", name: "revenue_summary", description: "Daily revenue aggregation by product line", sourceId: "ds_006", teamId: "team_003", classification: "confidential", freshnessSlaHours: 24, volumeThresholdPercent: 15, tags: ["revenue", "aggregation", "finance"], createdAt: daysAgo(50), updatedAt: daysAgo(1) },
    { id: "dataset_010", name: "user_sessions", description: "Web session data with page views and duration", sourceId: "ds_003", teamId: "team_002", classification: "internal", freshnessSlaHours: 6, volumeThresholdPercent: 30, tags: ["sessions", "web", "analytics"], createdAt: daysAgo(45), updatedAt: daysAgo(3) },
    { id: "dataset_011", name: "inventory_levels", description: "Real-time inventory levels across warehouses", sourceId: "ds_001", teamId: "team_001", classification: "internal", freshnessSlaHours: 2, volumeThresholdPercent: 40, tags: ["inventory", "warehouse"], createdAt: daysAgo(40), updatedAt: daysAgo(1) },
    { id: "dataset_012", name: "churn_predictions", description: "ML model churn prediction scores by user", sourceId: "ds_005", teamId: "team_004", classification: "confidential", freshnessSlaHours: 48, volumeThresholdPercent: 20, tags: ["ml", "churn", "predictions"], createdAt: daysAgo(35), updatedAt: daysAgo(5) },
  ];
}

// ==================== Contracts ====================
export function seedContracts(): DataContract[] {
  const contracts: DataContract[] = [];
  let contractNum = 1;

  const contractConfigs: {
    datasetId: string; version: number; status: DataContract["status"];
    fields: SchemaField[]; classification: DataContract["classification"];
    freshnessSla: number; volumeThreshold: number; description: string; createdBy: string;
    activatedDaysAgo: number | null;
  }[] = [
    // 1. user_events (active v2 + deprecated v1)
    {
      datasetId: "dataset_001", version: 2, status: "active",
      classification: "internal", freshnessSla: 6, volumeThreshold: 25,
      description: "User interaction events contract v2 - includes device info",
      createdBy: "user_003", activatedDaysAgo: 10,
      fields: [
        makeField("event_id", "string", true, { isPrimaryKey: true, description: "Unique event identifier" }),
        makeField("user_id", "string", true, { description: "User identifier" }),
        makeField("event_type", "enum", true, { enumValues: ["page_view", "click", "scroll", "purchase", "signup"], description: "Type of user event" }),
        makeField("timestamp", "datetime", true, { description: "Event timestamp" }),
        makeField("session_id", "string", false, { nullRateThreshold: 10, description: "Session identifier" }),
        makeField("page_url", "string", false, { nullRateThreshold: 15, regexPattern: "^https?://", description: "URL of the page" }),
        makeField("device_type", "enum", false, { enumValues: ["desktop", "mobile", "tablet"], nullRateThreshold: 20, description: "Device type" }),
        makeField("user_agent", "string", false, { nullRateThreshold: 30, description: "Browser user agent" }),
      ],
    },
    {
      datasetId: "dataset_001", version: 1, status: "deprecated",
      classification: "internal", freshnessSla: 6, volumeThreshold: 25,
      description: "User interaction events contract v1",
      createdBy: "user_003", activatedDaysAgo: 60,
      fields: [
        makeField("event_id", "string", true, { isPrimaryKey: true }),
        makeField("user_id", "string", true),
        makeField("event_type", "string", true),
        makeField("timestamp", "datetime", true),
        makeField("page_url", "string", false, { nullRateThreshold: 15 }),
      ],
    },
    // 2. orders
    {
      datasetId: "dataset_002", version: 3, status: "active",
      classification: "confidential", freshnessSla: 12, volumeThreshold: 20,
      description: "Orders contract v3 - added discount_code field",
      createdBy: "user_004", activatedDaysAgo: 5,
      fields: [
        makeField("order_id", "string", true, { isPrimaryKey: true, description: "Unique order ID" }),
        makeField("customer_id", "string", true, { description: "Customer reference" }),
        makeField("order_date", "datetime", true, { description: "Order placement timestamp" }),
        makeField("status", "enum", true, { enumValues: ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"], description: "Order status" }),
        makeField("total_amount", "float", true, { numericMin: 0, numericMax: 1000000, description: "Total order amount in USD" }),
        makeField("currency", "enum", true, { enumValues: ["USD", "EUR", "GBP", "CAD"], description: "Currency code" }),
        makeField("line_items_count", "integer", true, { numericMin: 1, numericMax: 1000, description: "Number of line items" }),
        makeField("shipping_address", "string", false, { nullRateThreshold: 20, description: "Shipping address" }),
        makeField("discount_code", "string", false, { nullRateThreshold: 70, description: "Applied discount code" }),
      ],
    },
    {
      datasetId: "dataset_002", version: 2, status: "deprecated",
      classification: "confidential", freshnessSla: 12, volumeThreshold: 20,
      description: "Orders contract v2",
      createdBy: "user_004", activatedDaysAgo: 40,
      fields: [
        makeField("order_id", "string", true, { isPrimaryKey: true }),
        makeField("customer_id", "string", true),
        makeField("order_date", "datetime", true),
        makeField("status", "enum", true, { enumValues: ["pending", "processing", "shipped", "delivered", "cancelled"] }),
        makeField("total_amount", "float", true, { numericMin: 0, numericMax: 1000000 }),
        makeField("currency", "string", true),
        makeField("line_items_count", "integer", true, { numericMin: 1 }),
      ],
    },
    // 3. customers
    {
      datasetId: "dataset_003", version: 2, status: "active",
      classification: "pii", freshnessSla: 24, volumeThreshold: 15,
      description: "Customer master data contract v2",
      createdBy: "user_006", activatedDaysAgo: 8,
      fields: [
        makeField("customer_id", "string", true, { isPrimaryKey: true, description: "Unique customer ID" }),
        makeField("email", "string", true, { regexPattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$", description: "Customer email address" }),
        makeField("first_name", "string", true, { description: "Customer first name" }),
        makeField("last_name", "string", true, { description: "Customer last name" }),
        makeField("phone", "string", false, { nullRateThreshold: 30, regexPattern: "^[\\d\\s\\-\\+\\(\\)]+$", description: "Phone number" }),
        makeField("date_of_birth", "date", false, { nullRateThreshold: 50, description: "Date of birth" }),
        makeField("address", "string", false, { nullRateThreshold: 25, description: "Street address" }),
        makeField("city", "string", false, { nullRateThreshold: 10, description: "City" }),
        makeField("state", "string", false, { nullRateThreshold: 15, description: "State or province" }),
        makeField("zip_code", "string", false, { nullRateThreshold: 15, regexPattern: "^\\d{5}(-\\d{4})?$", description: "ZIP code" }),
        makeField("created_at", "datetime", true, { description: "Account creation timestamp" }),
        makeField("is_active", "boolean", true, { description: "Active account flag" }),
      ],
    },
    // 4. payments
    {
      datasetId: "dataset_004", version: 1, status: "active",
      classification: "confidential", freshnessSla: 6, volumeThreshold: 30,
      description: "Payment transactions contract",
      createdBy: "user_004", activatedDaysAgo: 30,
      fields: [
        makeField("payment_id", "string", true, { isPrimaryKey: true, description: "Stripe payment ID" }),
        makeField("order_id", "string", true, { description: "Associated order ID" }),
        makeField("amount", "float", true, { numericMin: 0.01, numericMax: 1000000, description: "Payment amount" }),
        makeField("currency", "enum", true, { enumValues: ["USD", "EUR", "GBP", "CAD"], description: "Currency" }),
        makeField("status", "enum", true, { enumValues: ["succeeded", "pending", "failed", "refunded", "disputed"], description: "Payment status" }),
        makeField("payment_method", "enum", true, { enumValues: ["card", "bank_transfer", "wallet", "crypto"], description: "Payment method type" }),
        makeField("created_at", "datetime", true, { description: "Payment timestamp" }),
        makeField("failure_reason", "string", false, { nullRateThreshold: 80, description: "Failure reason if applicable" }),
      ],
    },
    // 5. ml_features_user_engagement
    {
      datasetId: "dataset_005", version: 1, status: "active",
      classification: "internal", freshnessSla: 4, volumeThreshold: 35,
      description: "ML engagement features contract",
      createdBy: "user_005", activatedDaysAgo: 20,
      fields: [
        makeField("user_id", "string", true, { isPrimaryKey: true, description: "User identifier" }),
        makeField("engagement_score", "float", true, { numericMin: 0, numericMax: 100, description: "Composite engagement score" }),
        makeField("sessions_7d", "integer", true, { numericMin: 0, numericMax: 10000, description: "Sessions in last 7 days" }),
        makeField("avg_session_duration", "float", true, { numericMin: 0, description: "Average session duration in seconds" }),
        makeField("page_views_7d", "integer", true, { numericMin: 0, description: "Page views in last 7 days" }),
        makeField("last_active_at", "datetime", true, { description: "Last activity timestamp" }),
        makeField("feature_vector_version", "string", true, { description: "Feature computation version" }),
      ],
    },
    // 6. products
    {
      datasetId: "dataset_006", version: 1, status: "active",
      classification: "internal", freshnessSla: 48, volumeThreshold: 10,
      description: "Product catalog contract",
      createdBy: "user_002", activatedDaysAgo: 25,
      fields: [
        makeField("product_id", "string", true, { isPrimaryKey: true, description: "Unique product ID" }),
        makeField("name", "string", true, { description: "Product name" }),
        makeField("category", "enum", true, { enumValues: ["electronics", "clothing", "home", "sports", "books", "food"], description: "Product category" }),
        makeField("price", "float", true, { numericMin: 0, numericMax: 100000, description: "List price" }),
        makeField("sku", "string", true, { description: "Stock keeping unit" }),
        makeField("inventory_count", "integer", true, { numericMin: 0, description: "Current inventory" }),
        makeField("is_active", "boolean", true, { description: "Active product flag" }),
        makeField("description", "string", false, { nullRateThreshold: 20, description: "Product description" }),
      ],
    },
    // 7. marketing_campaigns
    {
      datasetId: "dataset_007", version: 1, status: "active",
      classification: "internal", freshnessSla: 24, volumeThreshold: 25,
      description: "Marketing campaign metrics contract",
      createdBy: "user_003", activatedDaysAgo: 15,
      fields: [
        makeField("campaign_id", "string", true, { isPrimaryKey: true, description: "Campaign identifier" }),
        makeField("campaign_name", "string", true, { description: "Campaign name" }),
        makeField("channel", "enum", true, { enumValues: ["email", "social", "search", "display", "affiliate"], description: "Marketing channel" }),
        makeField("impressions", "integer", true, { numericMin: 0, description: "Ad impressions" }),
        makeField("clicks", "integer", true, { numericMin: 0, description: "Ad clicks" }),
        makeField("conversions", "integer", true, { numericMin: 0, description: "Conversion count" }),
        makeField("spend", "float", true, { numericMin: 0, description: "Campaign spend in USD" }),
        makeField("start_date", "date", true, { description: "Campaign start date" }),
        makeField("end_date", "date", false, { nullRateThreshold: 30, description: "Campaign end date" }),
      ],
    },
    // 8. support_tickets
    {
      datasetId: "dataset_008", version: 1, status: "active",
      classification: "confidential", freshnessSla: 12, volumeThreshold: 20,
      description: "Support tickets contract",
      createdBy: "user_006", activatedDaysAgo: 18,
      fields: [
        makeField("ticket_id", "string", true, { isPrimaryKey: true, description: "Ticket identifier" }),
        makeField("customer_id", "string", true, { description: "Customer reference" }),
        makeField("subject", "string", true, { description: "Ticket subject" }),
        makeField("status", "enum", true, { enumValues: ["open", "in_progress", "resolved", "closed", "escalated"], description: "Ticket status" }),
        makeField("priority", "enum", true, { enumValues: ["low", "medium", "high", "urgent"], description: "Priority level" }),
        makeField("category", "enum", true, { enumValues: ["billing", "technical", "general", "complaint", "feature_request"], description: "Ticket category" }),
        makeField("created_at", "datetime", true, { description: "Ticket creation time" }),
        makeField("resolved_at", "datetime", false, { nullRateThreshold: 50, description: "Resolution timestamp" }),
        makeField("agent_id", "string", false, { nullRateThreshold: 10, description: "Support agent ID" }),
      ],
    },
    // 9. revenue_summary
    {
      datasetId: "dataset_009", version: 1, status: "active",
      classification: "confidential", freshnessSla: 24, volumeThreshold: 15,
      description: "Daily revenue aggregation contract",
      createdBy: "user_004", activatedDaysAgo: 12,
      fields: [
        makeField("summary_date", "date", true, { isPrimaryKey: true, description: "Aggregation date" }),
        makeField("product_line", "enum", true, { enumValues: ["electronics", "clothing", "home", "sports", "books", "food"], description: "Product line" }),
        makeField("total_revenue", "float", true, { numericMin: 0, description: "Total revenue for the day" }),
        makeField("order_count", "integer", true, { numericMin: 0, description: "Number of orders" }),
        makeField("avg_order_value", "float", true, { numericMin: 0, description: "Average order value" }),
        makeField("refund_amount", "float", false, { nullRateThreshold: 20, numericMin: 0, description: "Total refunds" }),
      ],
    },
    // 10. user_sessions
    {
      datasetId: "dataset_010", version: 1, status: "active",
      classification: "internal", freshnessSla: 6, volumeThreshold: 30,
      description: "Web session data contract",
      createdBy: "user_003", activatedDaysAgo: 14,
      fields: [
        makeField("session_id", "string", true, { isPrimaryKey: true, description: "Session identifier" }),
        makeField("user_id", "string", false, { nullRateThreshold: 30, description: "User ID if logged in" }),
        makeField("start_time", "datetime", true, { description: "Session start" }),
        makeField("end_time", "datetime", false, { nullRateThreshold: 10, description: "Session end" }),
        makeField("duration_seconds", "integer", true, { numericMin: 0, description: "Session duration" }),
        makeField("page_count", "integer", true, { numericMin: 1, description: "Pages viewed" }),
        makeField("referrer", "string", false, { nullRateThreshold: 40, description: "Referring URL" }),
        makeField("browser", "string", false, { nullRateThreshold: 5, description: "Browser name" }),
        makeField("os", "string", false, { nullRateThreshold: 5, description: "Operating system" }),
      ],
    },
    // 11. inventory_levels
    {
      datasetId: "dataset_011", version: 1, status: "active",
      classification: "internal", freshnessSla: 2, volumeThreshold: 40,
      description: "Real-time inventory levels contract",
      createdBy: "user_002", activatedDaysAgo: 10,
      fields: [
        makeField("warehouse_id", "string", true, { isPrimaryKey: true, description: "Warehouse identifier" }),
        makeField("product_id", "string", true, { isPrimaryKey: true, description: "Product identifier" }),
        makeField("quantity", "integer", true, { numericMin: 0, description: "Current stock quantity" }),
        makeField("reserved", "integer", true, { numericMin: 0, description: "Reserved quantity" }),
        makeField("updated_at", "datetime", true, { description: "Last update timestamp" }),
        makeField("warehouse_location", "string", true, { description: "Warehouse location code" }),
      ],
    },
    // 12. churn_predictions
    {
      datasetId: "dataset_012", version: 1, status: "active",
      classification: "confidential", freshnessSla: 48, volumeThreshold: 20,
      description: "Churn prediction scores contract",
      createdBy: "user_005", activatedDaysAgo: 8,
      fields: [
        makeField("user_id", "string", true, { isPrimaryKey: true, description: "User identifier" }),
        makeField("churn_probability", "float", true, { numericMin: 0, numericMax: 1, description: "Predicted churn probability" }),
        makeField("risk_tier", "enum", true, { enumValues: ["low", "medium", "high", "critical"], description: "Risk tier classification" }),
        makeField("model_version", "string", true, { description: "ML model version" }),
        makeField("prediction_date", "date", true, { description: "Date of prediction" }),
        makeField("key_factors", "json", false, { nullRateThreshold: 10, description: "Top factors driving the prediction" }),
        makeField("recommended_action", "string", false, { nullRateThreshold: 20, description: "Suggested retention action" }),
      ],
    },
  ];

  for (const cfg of contractConfigs) {
    contracts.push({
      id: `contract_${String(contractNum).padStart(3, "0")}`,
      datasetId: cfg.datasetId,
      version: cfg.version,
      status: cfg.status,
      schemaFields: cfg.fields,
      rules: cfg.fields.filter(f => f.isPrimaryKey).map(f => ({
        id: `rule_${contractNum}_${f.name}`,
        type: "primary_key",
        field: f.name,
        value: "unique",
        description: `${f.name} must be unique`,
      })),
      classification: cfg.classification,
      freshnessSlaHours: cfg.freshnessSla,
      volumeThresholdPercent: cfg.volumeThreshold,
      description: cfg.description,
      createdBy: cfg.createdBy,
      createdAt: daysAgo(cfg.activatedDaysAgo ? cfg.activatedDaysAgo + 2 : 50),
      activatedAt: cfg.activatedDaysAgo ? daysAgo(cfg.activatedDaysAgo) : null,
    });
    contractNum++;
  }

  // Add some additional draft contracts to reach 30
  const draftContractSpecs = [
    { datasetId: "dataset_001", desc: "User events v3 draft - adding geo fields" },
    { datasetId: "dataset_002", desc: "Orders v4 draft - adding tax fields" },
    { datasetId: "dataset_003", desc: "Customers v3 draft - adding GDPR fields" },
    { datasetId: "dataset_004", desc: "Payments v2 draft - adding 3DS fields" },
    { datasetId: "dataset_005", desc: "ML features v2 draft - adding new features" },
    { datasetId: "dataset_006", desc: "Products v2 draft - adding dimensions" },
    { datasetId: "dataset_007", desc: "Campaigns v2 draft - adding attribution" },
    { datasetId: "dataset_008", desc: "Tickets v2 draft - adding CSAT" },
    { datasetId: "dataset_009", desc: "Revenue v2 draft - adding geo breakdown" },
    { datasetId: "dataset_010", desc: "Sessions v2 draft - adding device info" },
    { datasetId: "dataset_011", desc: "Inventory v2 draft - adding reorder points" },
    { datasetId: "dataset_012", desc: "Churn v2 draft - adding new model features" },
    { datasetId: "dataset_001", desc: "User events v1 legacy backup" },
    { datasetId: "dataset_002", desc: "Orders v1 legacy backup" },
    { datasetId: "dataset_003", desc: "Customers v1 legacy backup" },
    { datasetId: "dataset_004", desc: "Payments v1 legacy backup" },
    { datasetId: "dataset_005", desc: "ML features v1 legacy backup" },
    { datasetId: "dataset_006", desc: "Products v1 legacy backup" },
  ];

  for (const spec of draftContractSpecs) {
    const baseContract = contracts.find(c => c.datasetId === spec.datasetId && c.status === "active");
    contracts.push({
      id: `contract_${String(contractNum).padStart(3, "0")}`,
      datasetId: spec.datasetId,
      version: baseContract ? baseContract.version + 1 : 1,
      status: "draft",
      schemaFields: baseContract?.schemaFields || [],
      rules: baseContract?.rules || [],
      classification: baseContract?.classification || "internal",
      freshnessSlaHours: baseContract?.freshnessSlaHours || 24,
      volumeThresholdPercent: baseContract?.volumeThresholdPercent || 20,
      description: spec.desc,
      createdBy: "user_002",
      createdAt: daysAgo(Math.floor(Math.random() * 20) + 1),
      activatedAt: null,
    });
    contractNum++;
  }

  return contracts;
}

// ==================== Downstream Assets ====================
export function seedDownstreamAssets(): DownstreamAsset[] {
  const assets: DownstreamAsset[] = [
    // From user_events
    { id: "asset_001", name: "stg_user_events", type: "transformation", datasetId: "dataset_001", environment: "production", criticality: "high", owner: "Marcus Lee", teamId: "team_002", dependentFields: ["event_id", "user_id", "event_type", "timestamp"], description: "Staging transformation for user events", createdAt: daysAgo(60) },
    { id: "asset_002", name: "fct_user_engagement_daily", type: "warehouse", datasetId: "dataset_001", environment: "production", criticality: "critical", owner: "Marcus Lee", teamId: "team_002", dependentFields: ["user_id", "event_type", "timestamp", "session_id"], description: "Daily user engagement fact table", createdAt: daysAgo(55) },
    { id: "asset_003", name: "Executive Growth Dashboard", type: "dashboard", datasetId: "dataset_001", environment: "production", criticality: "critical", owner: "Tom Anderson", teamId: "team_002", dependentFields: ["event_type", "timestamp", "user_id"], description: "Weekly growth metrics for leadership", createdAt: daysAgo(40) },
    { id: "asset_004", name: "User Engagement Features", type: "ml_feature", datasetId: "dataset_001", environment: "production", criticality: "high", owner: "James Wilson", teamId: "team_004", dependentFields: ["user_id", "event_type", "timestamp"], description: "Feature store input for engagement model", createdAt: daysAgo(35) },

    // From orders
    { id: "asset_005", name: "stg_orders", type: "transformation", datasetId: "dataset_002", environment: "production", criticality: "critical", owner: "Priya Patel", teamId: "team_003", dependentFields: ["order_id", "customer_id", "status", "total_amount"], description: "Staging transformation for orders", createdAt: daysAgo(50) },
    { id: "asset_006", name: "fct_revenue_daily", type: "warehouse", datasetId: "dataset_002", environment: "production", criticality: "critical", owner: "Priya Patel", teamId: "team_003", dependentFields: ["order_id", "total_amount", "currency", "order_date"], description: "Daily revenue fact table", createdAt: daysAgo(45) },
    { id: "asset_007", name: "Finance Revenue Dashboard", type: "dashboard", datasetId: "dataset_002", environment: "production", criticality: "critical", owner: "Priya Patel", teamId: "team_003", dependentFields: ["total_amount", "currency", "status"], description: "Revenue dashboard for finance team", createdAt: daysAgo(30) },
    { id: "asset_008", name: "Revenue Anomaly Detection API", type: "api", datasetId: "dataset_002", environment: "production", criticality: "high", owner: "Lisa Zhang", teamId: "team_001", dependentFields: ["total_amount", "order_date"], description: "API endpoint for revenue anomaly alerts", createdAt: daysAgo(20) },

    // From customers
    { id: "asset_009", name: "dim_customers", type: "warehouse", datasetId: "dataset_003", environment: "production", criticality: "critical", owner: "Elena Garcia", teamId: "team_005", dependentFields: ["customer_id", "email", "first_name", "last_name"], description: "Customer dimension table", createdAt: daysAgo(40) },
    { id: "asset_010", name: "Customer 360 Dashboard", type: "dashboard", datasetId: "dataset_003", environment: "production", criticality: "high", owner: "Elena Garcia", teamId: "team_005", dependentFields: ["customer_id", "email", "city", "state"], description: "Customer profile and segmentation dashboard", createdAt: daysAgo(25) },

    // From payments
    { id: "asset_011", name: "stg_payments", type: "transformation", datasetId: "dataset_004", environment: "production", criticality: "high", owner: "Priya Patel", teamId: "team_003", dependentFields: ["payment_id", "order_id", "amount", "status"], description: "Staging transformation for payments", createdAt: daysAgo(28) },
    { id: "asset_012", name: "Payment Success Dashboard", type: "dashboard", datasetId: "dataset_004", environment: "production", criticality: "high", owner: "Priya Patel", teamId: "team_003", dependentFields: ["status", "amount", "payment_method"], description: "Payment success rate monitoring", createdAt: daysAgo(15) },

    // From ml_features_user_engagement
    { id: "asset_013", name: "Churn Model Training Pipeline", type: "transformation", datasetId: "dataset_005", environment: "production", criticality: "critical", owner: "James Wilson", teamId: "team_004", dependentFields: ["user_id", "engagement_score", "sessions_7d"], description: "ML training pipeline for churn model", createdAt: daysAgo(18) },

    // From support_tickets
    { id: "asset_014", name: "Support Ops Dashboard", type: "dashboard", datasetId: "dataset_008", environment: "production", criticality: "medium", owner: "Elena Garcia", teamId: "team_005", dependentFields: ["ticket_id", "status", "priority", "category"], description: "Support operations metrics dashboard", createdAt: daysAgo(12) },

    // From churn_predictions
    { id: "asset_015", name: "Customer Health API", type: "api", datasetId: "dataset_012", environment: "production", criticality: "high", owner: "James Wilson", teamId: "team_004", dependentFields: ["user_id", "churn_probability", "risk_tier"], description: "API for customer health scores", createdAt: daysAgo(8) },
  ];

  return assets;
}

// ==================== Lineage Edges ====================
export function seedLineageEdges(): LineageEdge[] {
  return [
    { id: "edge_001", fromAssetId: "asset_001", toAssetId: "asset_002", fieldMapping: ["event_id", "user_id", "event_type"] },
    { id: "edge_002", fromAssetId: "asset_002", toAssetId: "asset_003", fieldMapping: ["event_type", "timestamp", "user_id"] },
    { id: "edge_003", fromAssetId: "asset_002", toAssetId: "asset_004", fieldMapping: ["user_id", "event_type"] },
    { id: "edge_004", fromAssetId: "asset_005", toAssetId: "asset_006", fieldMapping: ["order_id", "total_amount"] },
    { id: "edge_005", fromAssetId: "asset_006", toAssetId: "asset_007", fieldMapping: ["total_amount", "currency"] },
    { id: "edge_006", fromAssetId: "asset_006", toAssetId: "asset_008", fieldMapping: ["total_amount", "order_date"] },
    { id: "edge_007", fromAssetId: "asset_009", toAssetId: "asset_010", fieldMapping: ["customer_id", "email", "city"] },
    { id: "edge_008", fromAssetId: "asset_011", toAssetId: "asset_012", fieldMapping: ["status", "amount"] },
    { id: "edge_009", fromAssetId: "asset_004", toAssetId: "asset_013", fieldMapping: ["user_id", "engagement_score"] },
    { id: "edge_010", fromAssetId: "asset_013", toAssetId: "asset_015", fieldMapping: ["user_id", "churn_probability"] },
  ];
}

// ==================== Validation Runs ====================
export function seedValidationRuns(): ValidationRun[] {
  const runs: ValidationRun[] = [];
  const statuses: ValidationRun["status"][] = ["passed", "failed", "warning", "passed", "passed", "warning", "failed", "passed", "passed", "warning"];
  const contractDatasetMap = new Map<string, string>();

  // We'll generate 50 validation runs across the datasets
  for (let i = 0; i < 50; i++) {
    const datasetIdx = i % 12;
    const dataset = `dataset_${String(datasetIdx + 1).padStart(3, "0")}`;
    const contract = contractDatasetMap.get(dataset) || `contract_${String(datasetIdx * 2 + 1).padStart(3, "0")}`;
    const status = statuses[i % statuses.length];
    const hoursBack = i * 8 + Math.floor(Math.random() * 4);
    const triggeredBy = ["Sarah Chen", "Marcus Lee", "Priya Patel", "James Wilson", "Elena Garcia"][i % 5];

    const issues: ValidationIssue[] = [];
    let passedChecks = 8;
    let failedChecks = 0;
    let warningChecks = 0;

    if (status === "failed") {
      // Realistic breaking scenarios
      if (datasetIdx === 0) {
        // user_events: column removed
        issues.push({
          fieldName: "device_type",
          changeType: "column_removed",
          severity: "breaking",
          message: 'Column "device_type" is defined in the contract but missing from the uploaded data.',
          expected: "device_type", actual: "missing",
        });
        issues.push({
          fieldName: "event_type",
          changeType: "data_type_changed",
          severity: "breaking",
          message: 'Column "event_type" type changed from enum to string.',
          expected: "enum", actual: "string",
        });
        failedChecks = 2;
        passedChecks = 6;
      } else if (datasetIdx === 1) {
        // orders: null rate exceeded on required field
        issues.push({
          fieldName: "total_amount",
          changeType: "null_rate_exceeded",
          severity: "breaking",
          message: 'Required column "total_amount" contains 12% nulls.',
          expected: "0% nulls", actual: "12% nulls",
        });
        issues.push({
          fieldName: "currency",
          changeType: "enum_value_outside_set",
          severity: "breaking",
          message: 'Column "currency" contains values outside the allowed enum set: JPY, AUD.',
          expected: "USD, EUR, GBP, CAD", actual: "JPY, AUD",
        });
        failedChecks = 2;
        passedChecks = 6;
      } else if (datasetIdx === 2) {
        // customers: PII detected in unclassified
        issues.push({
          fieldName: "ip_address",
          changeType: "pii_detected_unclassified",
          severity: "breaking",
          message: 'Potential PII (IP Address) detected in column "ip_address".',
          expected: "PII classification required", actual: "Detected: IP Address",
        });
        issues.push({
          fieldName: "customer_id",
          changeType: "primary_key_duplicate",
          severity: "breaking",
          message: 'Primary key column "customer_id" contains duplicate values.',
          expected: "all unique", actual: "950 unique / 1000 total",
        });
        failedChecks = 2;
        passedChecks = 10;
      } else {
        issues.push({
          fieldName: "unknown_field",
          changeType: "data_type_changed",
          severity: "breaking",
          message: "Data type mismatch detected.",
          expected: "string", actual: "integer",
        });
        failedChecks = 1;
        passedChecks = 7;
      }
    } else if (status === "warning") {
      issues.push({
        fieldName: "optional_field",
        changeType: "null_rate_exceeded",
        severity: "warning",
        message: "Null rate exceeds threshold for optional field.",
        expected: "<= 15%", actual: "22%",
      });
      issues.push({
        fieldName: "new_column",
        changeType: "column_added",
        severity: "non_breaking",
        message: "New column detected not in contract.",
        expected: "not in contract", actual: "new_column",
      });
      warningChecks = 1;
      passedChecks = 7;
    }

    runs.push({
      id: `valrun_${String(i + 1).padStart(3, "0")}`,
      datasetId: dataset,
      contractId: contract,
      status,
      issues,
      rowCount: 1000 + Math.floor(Math.random() * 49000),
      passedChecks,
      failedChecks,
      warningChecks,
      triggeredBy,
      createdAt: hoursAgo(hoursBack),
    });
  }

  return runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ==================== Schema Changes ====================
export function seedSchemaChanges(): SchemaChange[] {
  const changes: SchemaChange[] = [
    // Breaking: user_events - column removed
    {
      id: "schg_001", datasetId: "dataset_001", contractId: "contract_001",
      changeType: "column_removed", severity: "breaking",
      fieldName: "device_type",
      description: 'Column "device_type" was removed from the uploaded data.',
      plainEnglishExplanation: "BREAKING: The column \"device_type\" has been removed from the data. 4 downstream asset(s) depend on this field and will break if they reference it. This affects stg_user_events, fct_user_engagement_daily, Executive Growth Dashboard.",
      oldValue: "device_type", newValue: "missing",
      detectedAt: hoursAgo(16), detectedBy: "Marcus Lee",
    },
    // Breaking: orders - data type changed
    {
      id: "schg_002", datasetId: "dataset_002", contractId: "contract_003",
      changeType: "data_type_changed", severity: "breaking",
      fieldName: "total_amount",
      description: 'Column "total_amount" type changed from float to string.',
      plainEnglishExplanation: "BREAKING: The data type of \"total_amount\" changed from float to string. Transformations and dashboards expecting float values may break or produce incorrect results. This affects stg_orders, fct_revenue_daily, Finance Revenue Dashboard.",
      oldValue: "float", newValue: "string",
      detectedAt: hoursAgo(24), detectedBy: "Priya Patel",
    },
    // Breaking: customers - PII detected
    {
      id: "schg_003", datasetId: "dataset_003", contractId: "contract_005",
      changeType: "pii_detected_unclassified", severity: "breaking",
      fieldName: "ip_address",
      description: 'Potential PII (IP Address) detected in column "ip_address".',
      plainEnglishExplanation: "BREAKING: Potential PII (IP Address) was detected in column \"ip_address\", but this field is not classified as PII in the contract. This may violate data governance policies and require immediate classification update.",
      oldValue: "PII classification required", newValue: "Detected: IP Address",
      detectedAt: hoursAgo(36), detectedBy: "Elena Garcia",
    },
    // Warning: user_events - null rate
    {
      id: "schg_004", datasetId: "dataset_001", contractId: "contract_001",
      changeType: "null_rate_exceeded", severity: "warning",
      fieldName: "page_url",
      description: 'Column "page_url" null rate is 28%, exceeding the threshold of 15%.',
      plainEnglishExplanation: "WARNING: The null rate for \"page_url\" is 28%, exceeding the allowed threshold of 15%. This may cause errors in downstream systems that expect populated values.",
      oldValue: "<= 15%", newValue: "28%",
      detectedAt: daysAgo(2), detectedBy: "Marcus Lee",
    },
    // Non-breaking: new column added
    {
      id: "schg_005", datasetId: "dataset_004", contractId: "contract_006",
      changeType: "column_added", severity: "non_breaking",
      fieldName: "processor_fee",
      description: 'New column "processor_fee" detected that is not in the contract.',
      plainEnglishExplanation: "New column \"processor_fee\" was found in the data. This is not breaking but the contract should be updated to include it.",
      oldValue: "not in contract", newValue: "processor_fee",
      detectedAt: daysAgo(3), detectedBy: "Priya Patel",
    },
    // Breaking: primary key duplicate
    {
      id: "schg_006", datasetId: "dataset_003", contractId: "contract_005",
      changeType: "primary_key_duplicate", severity: "breaking",
      fieldName: "customer_id",
      description: 'Primary key column "customer_id" contains duplicate values.',
      plainEnglishExplanation: "BREAKING: Primary key column \"customer_id\" has duplicate values. This breaks uniqueness guarantees and can cause duplicate rows in downstream tables and incorrect aggregations in dashboards.",
      oldValue: "all unique", newValue: "950 unique / 1000 total",
      detectedAt: daysAgo(4), detectedBy: "Elena Garcia",
    },
    // Breaking: enum value outside set
    {
      id: "schg_007", datasetId: "dataset_002", contractId: "contract_003",
      changeType: "enum_value_outside_set", severity: "breaking",
      fieldName: "currency",
      description: 'Column "currency" contains values outside the allowed enum set: JPY, AUD.',
      plainEnglishExplanation: "BREAKING: Column \"currency\" contains values (JPY, AUD) not in the allowed set: USD, EUR, GBP, CAD. Downstream logic may not handle these new values correctly.",
      oldValue: "USD, EUR, GBP, CAD", newValue: "JPY, AUD",
      detectedAt: daysAgo(5), detectedBy: "Priya Patel",
    },
    // Warning: freshness SLA breach
    {
      id: "schg_008", datasetId: "dataset_011", contractId: "contract_011",
      changeType: "freshness_sla_breach", severity: "warning",
      fieldName: "_meta",
      description: "Data is 5 hours old, exceeding the 2-hour freshness SLA.",
      plainEnglishExplanation: "WARNING: The data freshness SLA has been breached. Data is older than the allowed window, meaning dashboards may be showing stale information to decision-makers.",
      oldValue: "<= 2 hours", newValue: "5 hours",
      detectedAt: daysAgo(6), detectedBy: "Sarah Chen",
    },
    // Breaking: new required column
    {
      id: "schg_009", datasetId: "dataset_005", contractId: "contract_006",
      changeType: "new_required_column", severity: "breaking",
      fieldName: "engagement_tier",
      description: 'New required column "engagement_tier" added to contract.',
      plainEnglishExplanation: "BREAKING: A new required column \"engagement_tier\" was added. Existing data pipelines that don't populate this field will fail validation.",
      oldValue: "not present", newValue: "required",
      detectedAt: daysAgo(7), detectedBy: "James Wilson",
    },
    // Non-breaking: column added
    {
      id: "schg_010", datasetId: "dataset_006", contractId: "contract_007",
      changeType: "column_added", severity: "non_breaking",
      fieldName: "weight",
      description: 'New column "weight" detected in products data.',
      plainEnglishExplanation: "New column \"weight\" was found in the data. This is not breaking but the contract should be updated to include it.",
      oldValue: "not in contract", newValue: "weight",
      detectedAt: daysAgo(8), detectedBy: "Sarah Chen",
    },
    // Warning: volume anomaly
    {
      id: "schg_011", datasetId: "dataset_001", contractId: "contract_001",
      changeType: "volume_anomaly", severity: "warning",
      fieldName: "_meta",
      description: "Data volume dropped 35% compared to historical average.",
      plainEnglishExplanation: "WARNING: Data volume has changed significantly compared to historical averages. This could indicate a data pipeline issue, source system change, or unexpected event.",
      oldValue: "100% of average", newValue: "65% of average",
      detectedAt: daysAgo(10), detectedBy: "Marcus Lee",
    },
    // Non-breaking: column renamed (warning)
    {
      id: "schg_012", datasetId: "dataset_010", contractId: "contract_010",
      changeType: "column_renamed", severity: "warning",
      fieldName: "referrer",
      description: 'Column "referrer" may have been renamed to "referral_source".',
      plainEnglishExplanation: "WARNING: Column \"referrer\" appears to have been renamed. Downstream consumers referencing the old name will fail.",
      oldValue: "referrer", newValue: "referral_source",
      detectedAt: daysAgo(12), detectedBy: "Marcus Lee",
    },
    // Breaking: data type changed
    {
      id: "schg_013", datasetId: "dataset_007", contractId: "contract_008",
      changeType: "data_type_changed", severity: "breaking",
      fieldName: "spend",
      description: 'Column "spend" type changed from float to integer.',
      plainEnglishExplanation: "BREAKING: The data type of \"spend\" changed from float to integer. Transformations and dashboards expecting float values may lose decimal precision.",
      oldValue: "float", newValue: "integer",
      detectedAt: daysAgo(14), detectedBy: "Marcus Lee",
    },
    // Warning: null rate
    {
      id: "schg_014", datasetId: "dataset_008", contractId: "contract_009",
      changeType: "null_rate_exceeded", severity: "warning",
      fieldName: "agent_id",
      description: 'Column "agent_id" null rate is 25%, exceeding threshold of 10%.',
      plainEnglishExplanation: "WARNING: The null rate for \"agent_id\" is 25%, exceeding the allowed threshold of 10%. This may cause errors in downstream systems that expect populated values.",
      oldValue: "<= 10%", newValue: "25%",
      detectedAt: daysAgo(16), detectedBy: "Elena Garcia",
    },
    // Non-breaking: column added
    {
      id: "schg_015", datasetId: "dataset_009", contractId: "contract_010",
      changeType: "column_added", severity: "non_breaking",
      fieldName: "region",
      description: 'New column "region" detected in revenue data.',
      plainEnglishExplanation: "New column \"region\" was found in the data. This is not breaking but the contract should be updated to include it.",
      oldValue: "not in contract", newValue: "region",
      detectedAt: daysAgo(18), detectedBy: "Priya Patel",
    },
    // Breaking: column removed
    {
      id: "schg_016", datasetId: "dataset_012", contractId: "contract_012",
      changeType: "column_removed", severity: "breaking",
      fieldName: "recommended_action",
      description: 'Column "recommended_action" was removed from churn predictions.',
      plainEnglishExplanation: "BREAKING: The column \"recommended_action\" has been removed from the data. Downstream assets that reference this field will break.",
      oldValue: "recommended_action", newValue: "missing",
      detectedAt: daysAgo(20), detectedBy: "James Wilson",
    },
    // Warning: enum outside set
    {
      id: "schg_017", datasetId: "dataset_008", contractId: "contract_009",
      changeType: "enum_value_outside_set", severity: "warning",
      fieldName: "category",
      description: 'Column "category" contains new value "billing_dispute" not in enum set.',
      plainEnglishExplanation: "WARNING: Column \"category\" contains a new value not in the allowed enum set. Downstream logic should be updated to handle this.",
      oldValue: "billing, technical, general, complaint, feature_request", newValue: "billing_dispute",
      detectedAt: daysAgo(22), detectedBy: "Elena Garcia",
    },
    // Non-breaking: column added
    {
      id: "schg_018", datasetId: "dataset_011", contractId: "contract_011",
      changeType: "column_added", severity: "non_breaking",
      fieldName: "reorder_point",
      description: 'New column "reorder_point" detected in inventory data.',
      plainEnglishExplanation: "New column \"reorder_point\" was found in the data. This is not breaking but the contract should be updated to include it.",
      oldValue: "not in contract", newValue: "reorder_point",
      detectedAt: daysAgo(24), detectedBy: "Sarah Chen",
    },
    // Breaking: null rate on required
    {
      id: "schg_019", datasetId: "dataset_004", contractId: "contract_006",
      changeType: "null_rate_exceeded", severity: "breaking",
      fieldName: "amount",
      description: 'Required column "amount" contains 8% nulls.',
      plainEnglishExplanation: "BREAKING: Required column \"amount\" contains 8% nulls. Required fields must have no nulls. Payment processing will fail for records with missing amounts.",
      oldValue: "0% nulls", newValue: "8% nulls",
      detectedAt: daysAgo(26), detectedBy: "Priya Patel",
    },
    // Warning: volume anomaly
    {
      id: "schg_020", datasetId: "dataset_002", contractId: "contract_003",
      changeType: "volume_anomaly", severity: "warning",
      fieldName: "_meta",
      description: "Data volume spiked 45% above historical average.",
      plainEnglishExplanation: "WARNING: Data volume has changed significantly compared to historical averages. This could indicate a data pipeline issue, source system change, or unexpected event like a flash sale.",
      oldValue: "100% of average", newValue: "145% of average",
      detectedAt: daysAgo(28), detectedBy: "Priya Patel",
    },
  ];

  return changes.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}

// ==================== Change Requests ====================
export function seedChangeRequests(): ChangeRequest[] {
  return [
    {
      id: "cr_001", title: "Remove device_type from user_events contract",
      description: "The device_type field is no longer populated by the Segment SDK after the v3 upgrade. Proposing to remove it from the active contract and update all downstream consumers.",
      datasetId: "dataset_001", contractId: "contract_001",
      status: "pending_review", proposedBy: "user_003", proposedAt: daysAgo(2),
      schemaChanges: [seedSchemaChanges()[0]],
      impactedAssets: ["asset_001", "asset_002", "asset_003", "asset_004"],
      riskScore: 72,
      comments: [
        { id: "c1", userId: "user_003", text: "Need approval before we can proceed with the SDK upgrade rollout.", createdAt: daysAgo(2) },
        { id: "c2", userId: "user_001", text: "Please confirm the Executive Growth Dashboard team has been notified.", createdAt: daysAgo(1) },
      ],
      activityTimeline: [
        { id: "a1", action: "created", userId: "user_003", timestamp: daysAgo(2), details: "Change request created" },
        { id: "a2", action: "commented", userId: "user_001", timestamp: daysAgo(1), details: "Commented on the request" },
      ],
      reviewedBy: null, reviewedAt: null,
    },
    {
      id: "cr_002", title: "Update orders contract to add JPY and AUD currencies",
      description: "We are expanding to Japanese and Australian markets. Need to add JPY and AUD to the allowed currency enum values and update downstream currency conversion logic.",
      datasetId: "dataset_002", contractId: "contract_003",
      status: "pending_review", proposedBy: "user_004", proposedAt: daysAgo(3),
      schemaChanges: [seedSchemaChanges()[6]],
      impactedAssets: ["asset_005", "asset_006", "asset_007", "asset_008"],
      riskScore: 55,
      comments: [
        { id: "c3", userId: "user_004", text: "Finance team has approved the currency expansion. Need platform approval.", createdAt: daysAgo(3) },
      ],
      activityTimeline: [
        { id: "a3", action: "created", userId: "user_004", timestamp: daysAgo(3), details: "Change request created" },
      ],
      reviewedBy: null, reviewedAt: null,
    },
    {
      id: "cr_003", title: "Add ip_address field with PII classification to customers",
      description: "New compliance requirement to capture and classify customer IP addresses. This field must be marked as PII and access must be restricted.",
      datasetId: "dataset_003", contractId: "contract_005",
      status: "approved", proposedBy: "user_006", proposedAt: daysAgo(7),
      schemaChanges: [seedSchemaChanges()[2]],
      impactedAssets: ["asset_009", "asset_010"],
      riskScore: 68,
      comments: [
        { id: "c4", userId: "user_006", text: "Legal team confirmed this is required for GDPR compliance.", createdAt: daysAgo(7) },
        { id: "c5", userId: "user_001", text: "Approved. Please ensure access controls are updated.", createdAt: daysAgo(5) },
      ],
      activityTimeline: [
        { id: "a4", action: "created", userId: "user_006", timestamp: daysAgo(7), details: "Change request created" },
        { id: "a5", action: "approved", userId: "user_001", timestamp: daysAgo(5), details: "Approved by admin" },
      ],
      reviewedBy: "user_001", reviewedAt: daysAgo(5),
    },
    {
      id: "cr_004", title: "Add engagement_tier as required field to ML features",
      description: "The churn model v2 requires an engagement_tier field. This is a new required column that all upstream pipelines must populate.",
      datasetId: "dataset_005", contractId: "contract_006",
      status: "changes_requested", proposedBy: "user_005", proposedAt: daysAgo(8),
      schemaChanges: [seedSchemaChanges()[8]],
      impactedAssets: ["asset_013", "asset_015"],
      riskScore: 61,
      comments: [
        { id: "c6", userId: "user_005", text: "This is needed for the v2 churn model rollout.", createdAt: daysAgo(8) },
        { id: "c7", userId: "user_003", text: "Can we make this optional first and require it after a transition period?", createdAt: daysAgo(6) },
      ],
      activityTimeline: [
        { id: "a6", action: "created", userId: "user_005", timestamp: daysAgo(8), details: "Change request created" },
        { id: "a7", action: "changes_requested", userId: "user_003", timestamp: daysAgo(6), details: "Requested making field optional initially" },
      ],
      reviewedBy: "user_003", reviewedAt: daysAgo(6),
    },
    {
      id: "cr_005", title: "Remove recommended_action from churn predictions",
      description: "The recommended_action field is being deprecated in favor of a separate action recommendations table. Proposing removal from the contract.",
      datasetId: "dataset_012", contractId: "contract_012",
      status: "rejected", proposedBy: "user_005", proposedAt: daysAgo(10),
      schemaChanges: [seedSchemaChanges()[15]],
      impactedAssets: ["asset_015"],
      riskScore: 45,
      comments: [
        { id: "c8", userId: "user_005", text: "The Customer Health API still depends on this field. Rejected.", createdAt: daysAgo(9) },
        { id: "c9", userId: "user_001", text: "Cannot remove - the API consumer still uses it. Please coordinate with Customer Insights first.", createdAt: daysAgo(8) },
      ],
      activityTimeline: [
        { id: "a8", action: "created", userId: "user_005", timestamp: daysAgo(10), details: "Change request created" },
        { id: "a9", action: "rejected", userId: "user_001", timestamp: daysAgo(8), details: "Rejected - downstream dependency not resolved" },
      ],
      reviewedBy: "user_001", reviewedAt: daysAgo(8),
    },
  ];
}

// ==================== Incidents ====================
export function seedIncidents(): Incident[] {
  return [
    {
      id: "inc_001", title: "Executive Growth Dashboard showing errors",
      description: "The Executive Growth Dashboard is throwing SQL errors due to missing device_type column in user_events data.",
      severity: "breaking", status: "open",
      datasetId: "dataset_001", contractId: "contract_001",
      validationRunId: "valrun_001", changeRequestId: "cr_001",
      affectedAssets: ["asset_003"],
      rootCause: "device_type column removed from Segment SDK output after v3 upgrade",
      assignedTo: "Marcus Lee",
      createdAt: hoursAgo(14), resolvedAt: null,
    },
    {
      id: "inc_002", title: "Finance Revenue Dashboard incorrect totals",
      description: "Revenue totals are showing as strings instead of floats, causing aggregation errors in the Finance Revenue Dashboard.",
      severity: "breaking", status: "investigating",
      datasetId: "dataset_002", contractId: "contract_003",
      validationRunId: "valrun_002", changeRequestId: null,
      affectedAssets: ["asset_007"],
      rootCause: "total_amount column data type changed from float to string in source system",
      assignedTo: "Priya Patel",
      createdAt: hoursAgo(22), resolvedAt: null,
    },
    {
      id: "inc_003", title: "Duplicate customer records in Customer 360 Dashboard",
      description: "The Customer 360 Dashboard is showing duplicate customer entries due to primary key violations in the customers dataset.",
      severity: "breaking", status: "resolved",
      datasetId: "dataset_003", contractId: "contract_005",
      validationRunId: "valrun_003", changeRequestId: "cr_003",
      affectedAssets: ["asset_009", "asset_010"],
      rootCause: "Customer records duplicated during Salesforce sync due to race condition",
      assignedTo: "Elena Garcia",
      createdAt: daysAgo(4), resolvedAt: daysAgo(2),
    },
    {
      id: "inc_004", title: "Inventory data freshness breach",
      description: "Inventory levels data is 5 hours stale, exceeding the 2-hour SLA. Warehouse operations dashboard may show outdated stock levels.",
      severity: "warning", status: "investigating",
      datasetId: "dataset_011", contractId: "contract_011",
      validationRunId: null, changeRequestId: null,
      affectedAssets: [],
      rootCause: "Inventory sync job failed and is stuck in retry loop",
      assignedTo: "Sarah Chen",
      createdAt: daysAgo(1), resolvedAt: null,
    },
    {
      id: "inc_005", title: "Marketing spend precision loss",
      description: "Marketing campaign spend values lost decimal precision due to data type change from float to integer.",
      severity: "breaking", status: "closed",
      datasetId: "dataset_007", contractId: "contract_008",
      validationRunId: null, changeRequestId: null,
      affectedAssets: [],
      rootCause: "Source system schema change converted spend from float to integer",
      assignedTo: "Marcus Lee",
      createdAt: daysAgo(14), resolvedAt: daysAgo(12),
    },
  ];
}

// ==================== Audit Logs ====================
export function seedAuditLogs(): AuditLog[] {
  return [
    { id: "aud_001", userId: "user_003", action: "create", entityType: "change_request", entityId: "cr_001", entityName: "Remove device_type from user_events", details: "Created change request", createdAt: daysAgo(2) },
    { id: "aud_002", userId: "user_001", action: "comment", entityType: "change_request", entityId: "cr_001", entityName: "Remove device_type from user_events", details: "Added comment", createdAt: daysAgo(1) },
    { id: "aud_003", userId: "user_004", action: "create", entityType: "change_request", entityId: "cr_002", entityName: "Update orders contract currencies", details: "Created change request", createdAt: daysAgo(3) },
    { id: "aud_004", userId: "user_006", action: "create", entityType: "change_request", entityId: "cr_003", entityName: "Add ip_address PII field", details: "Created change request", createdAt: daysAgo(7) },
    { id: "aud_005", userId: "user_001", action: "approve", entityType: "change_request", entityId: "cr_003", entityName: "Add ip_address PII field", details: "Approved change request", createdAt: daysAgo(5) },
    { id: "aud_006", userId: "user_005", action: "create", entityType: "change_request", entityId: "cr_004", entityName: "Add engagement_tier field", details: "Created change request", createdAt: daysAgo(8) },
    { id: "aud_007", userId: "user_003", action: "request_changes", entityType: "change_request", entityId: "cr_004", entityName: "Add engagement_tier field", details: "Requested changes", createdAt: daysAgo(6) },
    { id: "aud_008", userId: "user_005", action: "create", entityType: "change_request", entityId: "cr_005", entityName: "Remove recommended_action", details: "Created change request", createdAt: daysAgo(10) },
    { id: "aud_009", userId: "user_001", action: "reject", entityType: "change_request", entityId: "cr_005", entityName: "Remove recommended_action", details: "Rejected change request", createdAt: daysAgo(8) },
    { id: "aud_010", userId: "user_003", action: "validate", entityType: "validation_run", entityId: "valrun_001", entityName: "user_events validation", details: "Ran validation on user_events", createdAt: hoursAgo(16) },
    { id: "aud_011", userId: "user_004", action: "validate", entityType: "validation_run", entityId: "valrun_002", entityName: "orders validation", details: "Ran validation on orders", createdAt: hoursAgo(24) },
    { id: "aud_012", userId: "user_006", action: "validate", entityType: "validation_run", entityId: "valrun_003", entityName: "customers validation", details: "Ran validation on customers", createdAt: hoursAgo(36) },
    { id: "aud_013", userId: "user_002", action: "update", entityType: "contract", entityId: "contract_001", entityName: "user_events v2", details: "Activated contract version 2", createdAt: daysAgo(10) },
    { id: "aud_014", userId: "user_004", action: "update", entityType: "contract", entityId: "contract_003", entityName: "orders v3", details: "Activated contract version 3", createdAt: daysAgo(5) },
    { id: "aud_015", userId: "system", action: "detect", entityType: "schema_change", entityId: "schg_001", entityName: "device_type removed", details: "Automatically detected schema change", createdAt: hoursAgo(16) },
  ];
}

// ==================== Trend Data ====================
export function seedComplianceTrend(): ComplianceTrendPoint[] {
  const points: ComplianceTrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const total = 10 + Math.floor(Math.random() * 8);
    const failed = Math.floor(Math.random() * 3);
    const warning = Math.floor(Math.random() * 2);
    const passed = total - failed - warning;
    const score = Math.round((passed / total) * 100);
    points.push({
      date: date.toISOString().split("T")[0],
      score,
      total,
      passed,
      failed,
    });
  }
  return points;
}

export function seedDataQualityTrend(): DataQualityTrendPoint[] {
  const points: DataQualityTrendPoint[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const passRate = 70 + Math.floor(Math.random() * 25);
    const failRate = Math.floor(Math.random() * 15);
    const warningRate = 100 - passRate - failRate;
    points.push({
      date: date.toISOString().split("T")[0],
      passRate,
      failRate,
      warningRate,
    });
  }
  return points;
}
