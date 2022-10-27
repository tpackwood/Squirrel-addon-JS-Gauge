import { Component, OnInit } from '@angular/core';
import { SquirrelHelper } from '../squirrel-helper/squirrel-helper';
import * as am4core from "@amcharts/amcharts4/core";
import * as am4charts from "@amcharts/amcharts4/charts";
import am4themes_animated from "@amcharts/amcharts4/themes/animated";

@Component({
  selector: 'app-addon',
  templateUrl: './addon.component.html',
  styleUrls: ['./addon.component.scss']
})
export class AddonComponent extends SquirrelHelper implements OnInit {

  constructor() { super(); }

  chart: any;
  labelData: Array<any> = [];
  valueData: Array<any> = [];
  seriesColors: Array<any> = [];

  ngOnInit(): void {
    // Themes begin
    am4core.useTheme(am4themes_animated);
    // Themes end

    // Create chart instance
    this.chart = am4core.create("chartdiv", am4charts.RadarChart);

    // Add data
    this.chart.data = [];

    // Make chart not full circle
    this.chart.startAngle = -90;
    this.chart.endAngle = 180;
    this.chart.innerRadius = am4core.percent(20);

    // Set number format
    this.chart.numberFormatter.numberFormat = "#.#'%'";

    // Create axes
    let categoryAxis = this.chart.yAxes.push(new am4charts.CategoryAxis());
    categoryAxis.dataFields.category = "category";
    categoryAxis.renderer.grid.template.location = 0;
    categoryAxis.renderer.grid.template.strokeOpacity = 0;
    categoryAxis.renderer.labels.template.horizontalCenter = "right";
    categoryAxis.renderer.labels.template.fontWeight = 500;
    categoryAxis.renderer.labels.template.adapter.add("fill", (fill: any, target: any) => {
      return (target.dataItem.index >= 0) ? this.chart.colors.getIndex(target.dataItem.index) : fill;
    });
    categoryAxis.renderer.minGridDistance = 10;

    let valueAxis = this.chart.xAxes.push(new am4charts.ValueAxis());
    valueAxis.renderer.grid.template.strokeOpacity = 0;
    valueAxis.min = 0;
    valueAxis.max = 100;
    valueAxis.strictMinMax = true;

    // Create series
    let series1 = this.chart.series.push(new am4charts.RadarColumnSeries());
    series1.dataFields.valueX = "full";
    series1.dataFields.categoryY = "category";
    series1.clustered = false;
    series1.columns.template.fill = new am4core.InterfaceColorSet().getFor("alternativeBackground");
    series1.columns.template.fillOpacity = 0.08;
    series1.columns.template.cornerRadiusTopLeft = 20;
    series1.columns.template.strokeWidth = 0;
    series1.columns.template.radarColumn.cornerRadius = 20;

    let series2 = this.chart.series.push(new am4charts.RadarColumnSeries());
    series2.dataFields.valueX = "value";
    series2.dataFields.categoryY = "category";
    series2.clustered = false;
    series2.columns.template.strokeWidth = 0;
    series2.columns.template.tooltipText = "{category}: [bold]{value}[/]";
    series2.columns.template.radarColumn.cornerRadius = 20;

    series2.columns.template.adapter.add("fill", (fill: any, target: any) => {
      return this.chart.colors.getIndex(target.dataItem.index);
    });

    // Add cursor
    this.chart.cursor = new am4charts.RadarCursor();

    this.initWithSquirrel();

  }

  ngAfterViewInit() {
    // Hide icon in bottom-left
    (document.querySelector('[aria-labelledby="id-67-title"]') as HTMLElement).style.visibility = 'hidden';
  }

  override onSetPosition(position: any): void {
    super.onSetPosition(position);
  }

  override onSetSize(size: any): void {
    super.onSetSize(size);

    //document.getElementById('chartdiv').style.height = window.innerHeight + 'px';
  }

  override onInitState(state: any): void {
    super.onInitState(state);
    if (state != null) {
      this.processData(state.helloWorldData);
    }

    //set the state from the message
    //document.getElementById('chartdiv').style.height = window.innerHeight + 'px';



    if (state != null) {
        if (state.labelData) {
            this.labelData = state.labelData;
        }
        if (state.valueData) {
            this.valueData = state.valueData;
        }
        if (state.seriesColors) {
            this.seriesColors = state.seriesColors;
        }
        if (state.labelData && state.valueData) {
            this.updateData();
        }
    }
  }

  override onPropertyChange(property: any, value: any): void {
    super.onPropertyChange(property, value);

    switch (property) {
      case 'labelData':
          this.labelData = value;
          if (this.labelData.length && this.valueData.length) { this.updateData(); };
          break;
      case 'valueData':
          this.valueData = value;
          if (this.labelData.length && this.valueData.length) { this.updateData(); };
          break;
      // case 'seriesColors':
      //     seriesColors = value;
      //     if (labelData.length && valueData.length) { updateData(); };
      //     break;
      default:
          console.log("Unknown message type: " + property);
          break;
    }
  }

  override onPropertyChangesComplete(): void {
    super.onPropertyChangesComplete();
  }

  /**
   * Take a string, to be shown in the HTML display, reverse the
   * order of letters and then send back to Squirrel
   * @param value The string to display and return
   */
  processData(value: string) {
    this.sendToSquirrel('helloWorldResponse', value?.toUpperCase());
  }

  updateData() {
    var labels = this.labelData.flat();
    var values = this.valueData.flat();
    var colors = this.seriesColors.flat();

    var dataObj = values.map(function (x, i) {
      return { label: labels[i], value: x, color: colors[i] }
    });


    var newSeries = dataObj.map(function (x, i) {

        return {
            "category": x.label,
            "value": x.value,
            "full": 100
        }
    });

    this.chart.data = newSeries;
  }
}
