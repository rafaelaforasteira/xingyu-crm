import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { DemoUserMiddleware } from "./common/middleware/demo-user.middleware";
import { HealthModule } from "./health/health.module";
import { ContactsModule } from "./contacts/contacts.module";
import { CompaniesModule } from "./companies/companies.module";
import { PipelinesModule } from "./pipelines/pipelines.module";
import { DealsModule } from "./deals/deals.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { TasksModule } from "./tasks/tasks.module";
import { OrdersModule } from "./orders/orders.module";
import { ProductsModule } from "./products/products.module";
import { OccurrencesModule } from "./occurrences/occurrences.module";
import { RepurchaseModule } from "./repurchase/repurchase.module";
import { ReactivationModule } from "./reactivation/reactivation.module";
import { AutomationsModule } from "./automations/automations.module";
import { MarketingModule } from "./marketing/marketing.module";
import { ReportsModule } from "./reports/reports.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { SearchModule } from "./search/search.module";
import { SettingsModule } from "./settings/settings.module";
import { ActivitiesModule } from "./activities/activities.module";
import { NotesModule } from "./notes/notes.module";
import { IntegrationsModule } from "./integrations/integrations.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import path from "node:path";

const rootEnvFile = path.resolve(__dirname, "../../../.env");

function validateEnvironment(config: Record<string, unknown>) {
  if (!config.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL não foi definida. Execute pnpm setup:local ou configure o arquivo .env na raiz.",
    );
  }

  for (const name of ["POSTGRES_PORT", "API_PORT", "WEB_PORT"] as const) {
    const value = config[name];
    if (value !== undefined && (!Number.isInteger(Number(value)) || Number(value) < 1)) {
      throw new Error(`${name} deve ser uma porta válida.`);
    }
  }

  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvFile,
      validate: validateEnvironment,
    }),
    PrismaModule,
    DashboardModule,
    HealthModule,
    ContactsModule,
    CompaniesModule,
    PipelinesModule,
    DealsModule,
    ConversationsModule,
    TasksModule,
    OrdersModule,
    ProductsModule,
    OccurrencesModule,
    RepurchaseModule,
    ReactivationModule,
    AutomationsModule,
    MarketingModule,
    ReportsModule,
    NotificationsModule,
    SearchModule,
    SettingsModule,
    ActivitiesModule,
    NotesModule,
    IntegrationsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DemoUserMiddleware).forRoutes("*");
  }
}
