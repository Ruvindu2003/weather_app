import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthzModule } from './authz/authz.module';
import { WeatherModule } from './weather/weather.module';


@Module({
  imports: [AuthzModule, WeatherModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
