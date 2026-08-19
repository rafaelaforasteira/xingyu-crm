import {
  Module,
  NestModule,
  MiddlewareConsumer,
} from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { DemoUserMiddleware } from "./common/middleware/demo-user.middleware";
import { validateEnvironment } from "./common/env.validation";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./auth/guards/auth.guard";
import { RolesGuard } from "./auth/guards/roles.guard";
import { PermissionsGuard } from "./auth/guards/permissions.guard";
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
import { LeadFilesModule } from "./lead-files/lead-files.module";
import { UsersModule } from "./users/users.module";
import { FinanceModule } from "./finance/finance.module";
import { ClientsModule } from "./clients/clients.module";
import path from "node:path";

const rootEnvFile = path.resolve(__dirname, "../../../.env");

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvFile,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: Number(config.get("RATE_LIMIT_TTL") ?? 60) * 1000,
          limit: Number(config.get("RATE_LIMIT_MAX") ?? 200),
        },
      ],
    }),
    PrismaModule,
    AuthModule,
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
    LeadFilesModule,
    UsersModule,
    FinanceModule,
    ClientsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(DemoUserMiddleware).forRoutes("*");
  }
}
