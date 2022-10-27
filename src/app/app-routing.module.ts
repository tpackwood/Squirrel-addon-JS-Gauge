import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddonComponent } from './addon/addon.component';

const routes: Routes = [
  { path: '', component: AddonComponent, pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
