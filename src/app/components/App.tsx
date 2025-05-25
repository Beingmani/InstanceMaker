import React, { useState, useEffect } from 'react';
import { Button, Select, Card, Typography, Space, InputNumber, Table, Tag, Switch } from 'antd';
import { PlayCircleOutlined, CloseOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface ComponentProperty {
  name: string;
  type: 'VARIANT' | 'BOOLEAN' | 'EXPOSED_INSTANCE';
  values: string[];
}

interface ComponentInfo {
  id: string;
  name: string;
  properties: ComponentProperty[];
}

const App: React.FC = () => {
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [spacing, setSpacing] = useState<number>(20);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [includeBooleans, setIncludeBooleans] = useState<boolean>(true);
  const [includeExposedInstances, setIncludeExposedInstances] = useState<boolean>(false);

  useEffect(() => {
    // Request component data when the plugin loads
    parent.postMessage({ pluginMessage: { type: 'get-components' } }, '*');

    // Listen for messages from the plugin controller
    window.onmessage = (event) => {
      const { type, data } = event.data.pluginMessage || {};

      if (type === 'components-data') {
        setComponents(data);
      }
    };
  }, []);

  // Generate preview data for the selected component
  useEffect(() => {
    if (selectedComponent) {
      const component = components.find((c) => c.id === selectedComponent);
      if (component && component.properties.length > 0) {
        let filteredProperties = component.properties;

        if (!includeBooleans) {
          filteredProperties = filteredProperties.filter((prop) => prop.type !== 'BOOLEAN');
        }

        if (!includeExposedInstances) {
          filteredProperties = filteredProperties.filter((prop) => prop.type !== 'EXPOSED_INSTANCE');
        }

        if (filteredProperties.length > 0) {
          const combinations = generateCombinations(filteredProperties);
          const tableData = combinations.map((combo, index) => ({
            key: index,
            ...combo,
            preview: `Instance ${index + 1}`,
          }));
          setPreviewData(tableData);
        } else {
          setPreviewData([]);
        }
      } else {
        setPreviewData([]);
      }
    }
  }, [selectedComponent, components, includeBooleans, includeExposedInstances]);

  // Generate combinations function
  const generateCombinations = (properties: ComponentProperty[]): Record<string, string>[] => {
    let filteredProperties = properties;

    if (!includeBooleans) {
      filteredProperties = filteredProperties.filter((prop) => prop.type !== 'BOOLEAN');
    }

    if (!includeExposedInstances) {
      filteredProperties = filteredProperties.filter((prop) => prop.type !== 'EXPOSED_INSTANCE');
    }

    if (filteredProperties.length === 0) return [{}];

    const [first, ...rest] = filteredProperties;
    const restCombinations = generateCombinations(rest);

    const combinations: Record<string, string>[] = [];

    for (const value of first.values) {
      for (const restCombination of restCombinations) {
        combinations.push({
          [first.name]: value,
          ...restCombination,
        });
      }
    }

    return combinations;
  };

  const handleGenerate = () => {
    if (selectedComponent) {
      parent.postMessage(
        {
          pluginMessage: {
            type: 'generate-table',
            componentId: selectedComponent,
            spacing: spacing,
            includeBooleans: includeBooleans,
            includeExposedInstances: includeExposedInstances,
          },
        },
        '*'
      );
    }
  };

  const handleCancel = () => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
  };

  // Generate table columns dynamically based on component properties
  const selectedComponentData = components.find((c) => c.id === selectedComponent);
  let filteredProperties = selectedComponentData ? selectedComponentData.properties : [];

  if (!includeBooleans) {
    filteredProperties = filteredProperties.filter((prop) => prop.type !== 'BOOLEAN');
  }

  if (!includeExposedInstances) {
    filteredProperties = filteredProperties.filter((prop) => prop.type !== 'EXPOSED_INSTANCE');
  }

  // Generate table columns dynamically based on filtered component properties
  const tableColumns =
    filteredProperties.length > 0
      ? [
          ...filteredProperties.map((property) => ({
            title: `${property.name} (${
              property.type === 'EXPOSED_INSTANCE' ? 'exposed' : property.type.toLowerCase()
            })`,
            dataIndex: property.name,
            key: property.name,
            render: (value: string) => {
              let color = 'blue';
              if (property.type === 'BOOLEAN') {
                color = value === 'true' ? 'green' : 'red';
              } else if (property.type === 'EXPOSED_INSTANCE') {
                color = 'purple';
              }
              return <Tag color={color}>{value}</Tag>;
            },
          })),
          {
            title: 'Preview',
            dataIndex: 'preview',
            key: 'preview',
            render: (text: string) => <Text type="secondary">{text}</Text>,
          },
        ]
      : [];

  return (
    <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={3}>Component Variant Generator</Title>
          <Text type="secondary">
            Generate all possible instances for your components with every combination of variants, boolean properties,
            and exposed instances
          </Text>
        </div>

        <div>
          <Space align="center">
            <Text strong>Include Boolean Properties</Text>
            <Switch
              checked={includeBooleans}
              onChange={setIncludeBooleans}
              checkedChildren="Yes"
              unCheckedChildren="No"
            />
          </Space>
          {!includeBooleans && (
            <div style={{ marginTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Only variant properties will be included in combinations
              </Text>
            </div>
          )}
        </div>

        <div>
          <Space align="center">
            <Text strong>Include Exposed Instances</Text>
            <Switch
              checked={includeExposedInstances}
              onChange={setIncludeExposedInstances}
              checkedChildren="Yes"
              unCheckedChildren="No"
            />
          </Space>
          {!includeExposedInstances && (
            <div style={{ marginTop: '4px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Exposed instance properties will be excluded
              </Text>
            </div>
          )}
        </div>

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Select Component</Text>
              <Select
                style={{ width: '100%', marginTop: '8px' }}
                placeholder="Choose a component set..."
                value={selectedComponent}
                onChange={setSelectedComponent}
              >
                {components.map((component) => (
                  <Option key={component.id} value={component.id}>
                    {component.name} ({component.properties.length} properties)
                  </Option>
                ))}
              </Select>
            </div>

            {selectedComponentData && (
              <div>
                <Text strong>Component Properties:</Text>
                <div style={{ marginTop: '8px' }}>
                  {filteredProperties.map((property) => (
                    <div key={property.name} style={{ marginBottom: '8px' }}>
                      <Text code>{property.name}</Text>
                      <Tag size="small" style={{ marginLeft: '8px' }}>
                        {property.type === 'EXPOSED_INSTANCE' ? 'exposed' : property.type.toLowerCase()}
                      </Tag>
                      : {property.values.join(', ')}
                    </div>
                  ))}
                  {!includeBooleans && selectedComponentData.properties.some((p) => p.type === 'BOOLEAN') && (
                    <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {selectedComponentData.properties.filter((p) => p.type === 'BOOLEAN').length} boolean properties
                        hidden
                      </Text>
                    </div>
                  )}
                  {!includeExposedInstances &&
                    selectedComponentData.properties.some((p) => p.type === 'EXPOSED_INSTANCE') && (
                      <div
                        style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}
                      >
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {selectedComponentData.properties.filter((p) => p.type === 'EXPOSED_INSTANCE').length} exposed
                          instance properties hidden
                        </Text>
                      </div>
                    )}
                </div>
                <Text type="secondary">Total combinations: {previewData.length}</Text>
              </div>
            )}

            <div>
              <Text strong>Spacing between instances</Text>
              <InputNumber
                style={{ width: '100%', marginTop: '8px' }}
                value={spacing}
                onChange={(value) => setSpacing(value || 20)}
                min={0}
                max={200}
                addonAfter="px"
              />
            </div>
          </Space>
        </Card>

        {previewData.length > 0 && (
          <Card title="Preview - All Property Combinations">
            <Table
              columns={tableColumns}
              dataSource={previewData}
              pagination={{ pageSize: 10 }}
              size="small"
              scroll={{ y: 300 }}
            />
          </Card>
        )}

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          <Button onClick={handleCancel} icon={<CloseOutlined />}>
            Cancel
          </Button>
          <Button type="primary" onClick={handleGenerate} disabled={!selectedComponent} icon={<PlayCircleOutlined />}>
            Generate Table
          </Button>
        </Space>
      </Space>
    </div>
  );
};

export default App;
