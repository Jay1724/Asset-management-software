import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { AssetCategoriesModule } from "./asset-categories/asset-categories.module";
import { AssetsModule } from "./assets/assets.module";
import { AuthModule } from "./auth/auth.module";
import { TenantMiddleware } from "./common/middleware/tenant.middleware";
import { TenantScopeInterceptor } from "./common/interceptors/tenant-scope.interceptor";
import { PrismaModule } from "./prisma/prisma.module";
import { SitesModule } from "./sites/sites.module";
import { TenantModule } from "./tenant/tenant.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    TenantModule,
    AuthModule,
    SitesModule,
    AssetCategoriesModule,
    AssetsModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantScopeInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes("*");
  }
}
