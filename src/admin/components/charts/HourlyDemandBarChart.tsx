import React from 'react';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

export interface HourlyDemandItem {
  time: string;
  rides: number;
  revenue: number;
}

interface HourlyDemandBarChartProps {
  data: HourlyDemandItem[];
}

export const HourlyDemandBarChart: React.FC<HourlyDemandBarChartProps> = ({ data }) => {
  const categories = data.map((d) => d.time);
  const ridesData = data.map((d) => d.rides);
  const revenueData = data.map((d) => d.revenue);

  const series = [
    {
      name: 'Completed Rides',
      data: ridesData,
    },
    {
      name: 'Revenue (₱)',
      data: revenueData,
    },
  ];

  const options: ApexOptions = {
    colors: ['#0052D1', '#00C1FD'],
    chart: {
      fontFamily: 'Inter, -apple-system, sans-serif',
      type: 'bar',
      height: 190,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      background: 'transparent',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '42%',
        borderRadius: 5,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 3,
      colors: ['transparent'],
    },
    xaxis: {
      categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        style: {
          colors: '#94a3b8',
          fontSize: '10px',
          fontWeight: 500,
        },
      },
    },
    yaxis: [
      {
        title: {
          text: undefined,
        },
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '10px',
          },
          formatter: (val: number) => `${Math.round(val)}`,
        },
      },
      {
        opposite: true,
        title: {
          text: undefined,
        },
        labels: {
          style: {
            colors: '#94a3b8',
            fontSize: '10px',
          },
          formatter: (val: number) => `₱${Math.round(val)}`,
        },
      },
    ],
    grid: {
      borderColor: '#f1f5f9',
      strokeDashArray: 3,
      yaxis: {
        lines: {
          show: true,
        },
      },
      xaxis: {
        lines: {
          show: false,
        },
      },
      padding: {
        top: 0,
        right: 4,
        bottom: 0,
        left: 4,
      },
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontFamily: 'Inter, sans-serif',
      fontSize: '11px',
      fontWeight: 500,
      labels: {
        colors: '#64748b',
      },
      markers: {
        size: 4,
        shape: 'circle',
      },
      itemMargin: {
        horizontal: 8,
        vertical: 0,
      },
    },
    fill: {
      opacity: 1,
    },
    tooltip: {
      theme: 'light',
      x: {
        show: true,
        formatter: (val) => `${val}`,
      },
      y: {
        formatter: (val: number, opts?: any) =>
          opts?.seriesIndex === 0 ? `${val} rides` : `₱${val?.toLocaleString()}`,
      },
    },
  };

  return (
    <div className="w-full">
      <div className="-ml-3 -mr-2">
        <Chart options={options} series={series} type="bar" height={190} />
      </div>
    </div>
  );
};
