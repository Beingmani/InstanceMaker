import React, { useState, useEffect } from 'react';
import { Button, Select, Card, Typography, Space, InputNumber, Table, Tag, Switch, Alert, Progress } from 'antd';
import { PlayCircleOutlined, CloseOutlined,UnlockOutlined, LockOutlined, CrownOutlined} from '@ant-design/icons';

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

// Payment Alert Component
const UsageAlert = ({
  isPaid,
  usageCount,
  FREE_USAGE_LIMIT,
  usagePercentage,
  initiatePayment,
}) => {
  const showUpgrade = usageCount >= FREE_USAGE_LIMIT && !isPaid;

  const renderStatus = () => {
    if (isPaid) {
      return (
        <Text strong style={{ fontSize: "12px", marginBottom: "12px" }}>
          Premium
        </Text>
      );
    }
    if (showUpgrade) {
      return (
        <Button
          type="primary"
          icon={<CrownOutlined />}
          size="small"
          onClick={initiatePayment}
          style={{
            padding: "0 8px",
            height: "20px",
            fontSize: "10px",
            backgroundColor: "#FA8C16",
            borderColor: "#FA8C16",
            marginBottom: "12px"
          }}
        >
          Upgrade
        </Button>
      );
    }
    return (
      <Text strong style={{ fontSize: "12px", marginBottom: "12px" }}>
        Free
      </Text>
    );
  };

  return (
    <Alert
      message={
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Text style={{ fontSize: "12px", fontWeight: 500 }}>
                {renderStatus()}
              </Text>
            </div>
            <Text style={{ fontSize: "12px" }}>
              {isPaid ? "Unlimited" : `${usageCount}/${FREE_USAGE_LIMIT}`}
            </Text>
          </div>

          {!isPaid && (
            <Progress percent={usagePercentage} size="small" showInfo={false} />
          )}
        </div>
      }
      type={isPaid ? "success" : showUpgrade ? "warning" : "info"}
    />
  );
};

const App: React.FC = () => {
 
 // Make sure this is correctly typed
const [selectedComponent, setSelectedComponent] = useState<ComponentInfo | null>(null);
  const [spacing, setSpacing] = useState<number>(20);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [includeBooleans, setIncludeBooleans] = useState<boolean>(true);
  const [includeExposedInstances, setIncludeExposedInstances] = useState<boolean>(false);
  const [toggledProperties, setToggledProperties] = useState<Record<string, boolean>>({});
  const [usageCount, setUsageCount] = useState<number | "unlimited">(0);
const [isPaid, setIsPaid] = useState<boolean>(false);
const FREE_USAGE_LIMIT = 1;

useEffect(() => {
  // Check payment status on mount
  parent.postMessage(
    {
      pluginMessage: {
        type: "check-payment-status",
      },
    },
    "*"
  );

  // Listen for messages from the plugin controller
  window.onmessage = (event) => {
    const { type, data, usageCount, isPaid } = event.data.pluginMessage || {};
    
    if (type === 'component-selected') {
      setSelectedComponent(data);
    } else if (type === 'selection-cleared') {
      setSelectedComponent(null);
      setToggledProperties({});
    } else if (type === 'update-usage') {
      // Handle payment status updates - fix the data structure
      setUsageCount(usageCount !== undefined ? usageCount : data?.usageCount);
      setIsPaid(isPaid !== undefined ? isPaid : data?.isPaid);
      console.log('Payment status updated:', { usageCount, isPaid }); // Debug log
    }
  };
}, []);

  // Generate preview data for the selected component
useEffect(() => {
  if (selectedComponent) {
    const initialToggles: Record<string, boolean> = {};
    selectedComponent.properties.forEach(prop => {
      // Only include properties that pass the global filters
      const shouldInclude = 
        (prop.type === 'VARIANT') ||
        (prop.type === 'BOOLEAN' && includeBooleans) ||
        (prop.type === 'EXPOSED_INSTANCE' && includeExposedInstances);
      
      initialToggles[prop.name] = shouldInclude;
    });
    setToggledProperties(initialToggles);
  }
}, [selectedComponent, includeBooleans, includeExposedInstances]);

// Add these payment functions
const initiatePayment = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "initiate-payment",
      },
    },
    "*"
  );
};

const toggleDevPaymentStatus = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "toggle-dev-payment-status",
      },
    },
    "*"
  );
};

const resetUsageCount = () => {
  parent.postMessage(
    {
      pluginMessage: {
        type: "reset-usage-count",
      },
    },
    "*"
  );
};

// Calculate remaining free uses
const remainingUses = typeof usageCount === "number" ? Math.max(0, FREE_USAGE_LIMIT - usageCount) : "unlimited";
const usagePercentage = typeof usageCount === "number" ? (usageCount / FREE_USAGE_LIMIT) * 100 : 100;

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

const calculateCombinations = (): number => {
  if (!selectedComponent) return 0;
  
  const enabledProperties = selectedComponent.properties.filter(prop => {
    // Apply global filters first
    if (prop.type === 'BOOLEAN' && !includeBooleans) return false;
    if (prop.type === 'EXPOSED_INSTANCE' && !includeExposedInstances) return false;
    
    // Then apply individual toggles
    return toggledProperties[prop.name];
  });
  
  if (enabledProperties.length === 0) return 0;
  
  return enabledProperties.reduce((total, prop) => total * prop.values.length, 1);
};

const handleGenerate = () => {
  if (selectedComponent) {
    const enabledProperties = selectedComponent.properties
      .filter(prop => {
        // Apply global filters
        if (prop.type === 'BOOLEAN' && !includeBooleans) return false;
        if (prop.type === 'EXPOSED_INSTANCE' && !includeExposedInstances) return false;
        // Apply individual toggles
        return toggledProperties[prop.name];
      })
      .map(prop => prop.name);
    
    parent.postMessage({
      pluginMessage: {
        type: 'generate-table',
        componentId: selectedComponent.id,
        spacing: spacing,
        enabledProperties: enabledProperties
      }
    }, '*');
  }
};
  const handleCancel = () => {
    parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
  };

  // Generate table columns dynamically based on component properties
 const selectedComponentData = selectedComponent;
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

        {/* ADD THIS BLOCK */}
<div style={{ marginBottom: "16px" }}>
  <UsageAlert
    isPaid={isPaid}
    usageCount={usageCount}
    FREE_USAGE_LIMIT={FREE_USAGE_LIMIT}
    usagePercentage={usagePercentage}
    initiatePayment={initiatePayment}
  />
</div>
        <div>
          <Title level={3}>Component Variant Generator</Title>
          <Text type="secondary">
            Generate all possible instances for your components with every combination of variants, boolean properties,
            and exposed instances
          </Text>
        </div>
       
<div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
        <Button size="small" onClick={toggleDevPaymentStatus}>
          Toggle Payment
        </Button>
        <Button size="small" onClick={resetUsageCount}>
          Reset Usage
        </Button>
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
           // Replace the dropdown section with selection instructions
<Card>
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    {!selectedComponent ? (
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          👆 Select a Component or Component Set from the canvas
        </Text>
        <br />
        <Text type="secondary" style={{ fontSize: '14px', marginTop: '8px' }}>
          Click on any component, component set, or instance in Figma to get started
        </Text>
      </div>
    ) : (
      <div>
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f', 
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <Space align="center">
            <Text strong style={{ color: '#52c41a' }}>✅ Selected:</Text>
            <Text code style={{ fontSize: '14px' }}>{selectedComponent.name}</Text>
            <Tag color="blue">{selectedComponent.properties.length} properties</Tag>
          </Space>
        </div>

        {/* Rest of your existing component properties display */}
        {selectedComponent.properties.length > 0 ? (
          <div>
            <Text strong>Component Properties - Toggle what to include:</Text>
            {/* ... existing properties display code ... */}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <Text type="secondary">
              This component doesn't have any variant, boolean, or exposed instance properties to generate combinations from.
            </Text>
          </div>
        )}
      </div>
    )}
    
    {/* Spacing input - only show when component is selected */}
    {selectedComponent && (
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
    )}
  </Space>
</Card>

           {selectedComponentData && (
  <div>
    <Text strong>Component Properties - Toggle what to include:</Text>
    <div style={{ marginTop: '12px' }}>
      {selectedComponentData.properties
        .filter(property => {
          // Apply global filters first
          if (property.type === 'BOOLEAN' && !includeBooleans) return false;
          if (property.type === 'EXPOSED_INSTANCE' && !includeExposedInstances) return false;
          return true;
        })
        .map(property => (
          <div key={property.name} style={{ 
            marginBottom: '12px', 
            padding: '8px', 
            border: '1px solid #d9d9d9', 
            borderRadius: '4px',
            backgroundColor: toggledProperties[property.name] ? '#f6ffed' : '#fff2f0'
          }}>
            <Space align="center">
              <Switch 
                checked={toggledProperties[property.name] || false}
                onChange={(checked) => setToggledProperties(prev => ({
                  ...prev,
                  [property.name]: checked
                }))}
                size="small"
              />
              <Text code>{property.name}</Text>
              <Tag size="small" color={
                property.type === 'VARIANT' ? 'blue' :
                property.type === 'BOOLEAN' ? 'green' : 'purple'
              }>
                {property.type === 'EXPOSED_INSTANCE' ? 'exposed' : property.type.toLowerCase()}
              </Tag>
              <Text type="secondary">: {property.values.join(', ')}</Text>
            </Space>
          </div>
        ))}
      
      {/* Show hidden properties info */}
      {!includeBooleans && selectedComponentData.properties.some(p => p.type === 'BOOLEAN') && (
        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {selectedComponentData.properties.filter(p => p.type === 'BOOLEAN').length} boolean properties hidden by global setting
          </Text>
        </div>
      )}
      {!includeExposedInstances && selectedComponentData.properties.some(p => p.type === 'EXPOSED_INSTANCE') && (
        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {selectedComponentData.properties.filter(p => p.type === 'EXPOSED_INSTANCE').length} exposed instance properties hidden by global setting
          </Text>
        </div>
      )}
    </div>
    <Text type="secondary">
      Total combinations: {calculateCombinations()}
    </Text>
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
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
  <Button onClick={handleCancel} icon={<CloseOutlined />}>
    Cancel
  </Button>
  <Button
    type="primary"
    onClick={handleGenerate}
    disabled={
      !selectedComponent || 
      calculateCombinations() === 0 ||
      (typeof usageCount === "number" && usageCount >= FREE_USAGE_LIMIT && !isPaid)
    }
    icon={<PlayCircleOutlined />}
  >
    {!isPaid && typeof usageCount === "number" && usageCount >= FREE_USAGE_LIMIT 
      ? 'Upgrade Required' 
      : 'Generate Table'
    }
  </Button>
  
  {/* Add premium indicator button */}
  <Button
    icon={isPaid ? <UnlockOutlined /> : <LockOutlined />}
    type="dashed"
    onClick={!isPaid ? initiatePayment : undefined}
    disabled={isPaid}
    title={isPaid ? "Premium features unlocked" : "Unlock premium features"}
  />
</Space>
        </Space>
      </Space>
    </div>
  );
};

export default App;
