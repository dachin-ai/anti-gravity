import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, Row, Col, DatePicker, Button, Table, Statistic, Select } from "antd";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ResponsiveContainer } from 'recharts';

const UserActivity = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState([]);
  const [userTable, setUserTable] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("line");
  const [selectedTool, setSelectedTool] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/api/access/user-activity", {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
      setSummary(res.data.summary);
      setUserTable(res.data.user_table);
    } catch (err) {
      setError("Gagal mengambil data aktivitas.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h2>User Activity Dashboard</h2>
      
      {/* Controls */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <label>Start Date: </label>
            <DatePicker 
              style={{ width: '100%' }} 
              value={startDate ? new Date(startDate) : null} 
              onChange={(date) => setStartDate(date ? date.toISOString().split('T')[0] : '')}
            />
          </Col>
          <Col span={6}>
            <label>End Date: </label>
            <DatePicker 
              style={{ width: '100%' }} 
              value={endDate ? new Date(endDate) : null} 
              onChange={(date) => setEndDate(date ? date.toISOString().split('T')[0] : '')}
            />
          </Col>
          <Col span={4}>
            <label>Chart Type: </label>
            <Select value={chartType} onChange={setChartType} style={{ width: '100%' }}>
              <Select.Option value="line">Line Chart</Select.Option>
              <Select.Option value="bar">Bar Chart</Select.Option>
            </Select>
          </Col>
          <Col span={4}>
            <label>Tool Filter: </label>
            <Select value={selectedTool} onChange={setSelectedTool} style={{ width: '100%' }}>
              <Select.Option value="all">All Tools</Select.Option>
              {summary.map(tool => (
                <Select.Option key={tool.tool} value={tool.tool}>{tool.tool}</Select.Option>
              ))}
            </Select>
          </Col>
          <Col span={4}>
            <Button type="primary" onClick={fetchData} loading={loading} style={{ marginTop: 24 }}>
              Filter Data
            </Button>
          </Col>
        </Row>
      </Card>

      {error && <div style={{ color: "red", marginBottom: 16 }}>{error}</div>}

      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total Tools Used" value={summary.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Total Users" value={userTable.length} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Total Activities" 
              value={summary.reduce((sum, tool) => sum + tool.data.reduce((toolSum, row) => toolSum + row.count, 0), 0)} 
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="Most Active Tool" 
              value={summary.length > 0 ? summary.reduce((max, tool) => 
                tool.data.reduce((toolSum, row) => toolSum + row.count, 0) > max.count ? tool : max, 
                { tool: '', count: 0 }
              ).tool : 'N/A'} 
            />
          </Card>
        </Col>
      </Row>

      {/* Chart Visualization */}
      {summary.length > 0 && (
        <Card title="Activity Trends" style={{ marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === "line" ? (
              <LineChart data={prepareChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" />
              </LineChart>
            ) : (
              <BarChart data={prepareChartData()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </Card>
      )}

      {/* Detailed Tables */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="Tools Usage (Line Data)" size="small">
            <Table 
              dataSource={prepareTableData()} 
              columns={[
                { title: 'Tool', dataIndex: 'tool', key: 'tool' },
                { title: 'Date', dataIndex: 'date', key: 'date' },
                { title: 'Count', dataIndex: 'count', key: 'count' }
              ]}
              pagination={{ pageSize: 10 }}
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="User Tool Usage" size="small">
            <Table 
              dataSource={userTable} 
              columns={[
                { title: 'User', dataIndex: 'user', key: 'user', fixed: 'left', width: 120 },
                ...summary.map(tool => ({
                  title: tool.tool,
                  dataIndex: ['tools', tool.tool],
                  key: tool.tool,
                  width: 80,
                  render: (text) => text || 0
                }))
              ]}
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800, y: 300 }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );

  // Helper functions
  const prepareChartData = () => {
    const filteredData = selectedTool === "all" 
      ? summary 
      : summary.filter(tool => tool.tool === selectedTool);
    
    const chartData = [];
    const dateMap = {};
    
    filteredData.forEach(tool => {
      tool.data.forEach(row => {
        if (!dateMap[row.date]) {
          dateMap[row.date] = { date: row.date, total: 0 };
        }
        dateMap[row.date].total += row.count;
      });
    });
    
    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const prepareTableData = () => {
    const filteredData = selectedTool === "all" 
      ? summary 
      : summary.filter(tool => tool.tool === selectedTool);
    
    const tableData = [];
    filteredData.forEach(tool => {
      tool.data.forEach(row => {
        tableData.push({
          key: `${tool.tool}-${row.date}`,
          tool: tool.tool,
          date: row.date,
          count: row.count
        });
      });
    });
    return tableData;
  };
};

export default UserActivity;
