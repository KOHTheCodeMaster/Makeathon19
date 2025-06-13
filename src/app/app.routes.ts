import {Routes} from '@angular/router';
import {StartNewSessionComponent} from './components/start-new-session/start-new-session.component';
import {SessionActiveComponent} from './components/session-active/session-active.component';

export const routes: Routes = [

  {path: 'start-new-session', component: StartNewSessionComponent},
  {path: 'session-active', component: SessionActiveComponent},
  {path: '', redirectTo: '/start-new-session', pathMatch: 'full'},
  {path: '**', redirectTo: '/', pathMatch: 'full'}

];
