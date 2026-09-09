import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

export interface FleetDistributionItem {
  name: string;
  value: number;
}

interface FleetDistributionPieChartProps {
  data: FleetDistributionItem[];
}

const TAILADMIN_PIE_COLORS = ['#0052D1', '#00C1FD', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

export const FleetDistributionPieChart: React.FC<FleetDistributionPieChartProps> = ({ data }) => {
  // Ensure we have valid data
  const chartData = data.length > 0 ? data : [{ name: 'Active Fleet', value: 1 }];
  const series = chartData.map((d) => d.value);
  const labels = chartData.map((d) => d.name);
  const totalFleet = series.reduce((a, b) => a + b, 0);

  const options: ApexOptions = {
    chart: {
      type: 'donut',
      fontFamily: 'Inter, -apple-system, sans-serif',
      sparkline: {
        enabled: true,
      },
      animations: {
        enabled: true,
        speed: 600,
      },
    },
    colors: TAILADMIN_PIE_COLORS.slice(0, chartData.length),
    stroke: {
      width: 2,
      colors: ['#ffffff'],
    },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            name: {
              show: true,
              fontSize: '11px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: '#64748b',
              offsetY: -3,
            },
            value: {
              show: true,
              fontSize: '18px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              color: '#0f172a',
              offsetY: 2,
              formatter: (val: string) => val,
            },
            total: {
              show: true,
              label: 'Total Fleet',
              fontSize: '10px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              color: '#94a3b8',
              formatter: () => `${totalFleet}`,
            },
          },
        },
      },
    },
    labels,
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false, // We render the custom TailAdmin pill breakdown beside the chart
    },
    tooltip: {
      theme: 'light',
      y: {
        formatter: (val: number) => {
          const pct = totalFleet > 0 ? Math.round((val / totalFleet) * 100) : 0;
          return `${val} units (${pct}%)`;
        },
      },
    },
  };

  return (
    <div className="flex items-center justify-between gap-3 w-full">
      {/* Donut Chart with Center Summary */}
      <div className="w-[145px] h-[145px] shrink-0 flex items-center justify-center">
        <Chart options={options} series={series} type="donut" width="145" height="145" />
      </div>

      {/* TailAdmin Legend Breakdown */}
      <div className="flex-1 space-y-1.5 min-w-0 pr-1">
        {chartData.slice(0, 4).map((item, idx) => {
          const color = TAILADMIN_PIE_COLORS[idx % TAILADMIN_PIE_COLORS.length];
          const pct = totalFleet > 0 ? Math.round((item.value / totalFleet) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center justify-between text-[11px] gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-600 dark:text-slate-400 truncate font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] text-slate-400 font-mono">({pct}%)</span>
                <strong className="text-slate-900 dark:text-white font-mono text-xs">{item.value}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
