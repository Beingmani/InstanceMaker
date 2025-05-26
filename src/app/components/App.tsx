import React, { useState, useEffect } from "react";
import {
  Button,
  Select,
  Card,
  Typography,
  Space,
  InputNumber,
  Table,
  Tag,
  Switch,
  Alert,
  Progress,
} from "antd";
import {
  BooleanIcon,
  VariantIcon,
  NestedIcon

} from "./customIcons";
import {
  PlayCircleOutlined,
  CloseOutlined,
  UnlockOutlined,
  LockOutlined,
  CrownOutlined,
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;

interface ComponentProperty {
  name: string;
  type: "VARIANT" | "BOOLEAN" | "EXPOSED_INSTANCE";
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
            marginBottom: "12px",
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
  const [selectedComponent, setSelectedComponent] =
    useState<ComponentInfo | null>(null);
  const [spacing, setSpacing] = useState<number>(20);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [includeBooleans, setIncludeBooleans] = useState<boolean>(true);
  const [includeExposedInstances, setIncludeExposedInstances] =
    useState<boolean>(false);
  const [toggledProperties, setToggledProperties] = useState<
    Record<string, boolean>
  >({});
  const [usageCount, setUsageCount] = useState<number | "unlimited">(0);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const FREE_USAGE_LIMIT = 10;

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

      if (type === "component-selected") {
        setSelectedComponent(data);
      } else if (type === "selection-cleared") {
        setSelectedComponent(null);
        setToggledProperties({});
      } else if (type === "update-usage") {
        // Handle payment status updates - fix the data structure
        setUsageCount(usageCount !== undefined ? usageCount : data?.usageCount);
        setIsPaid(isPaid !== undefined ? isPaid : data?.isPaid);
        console.log("Payment status updated:", { usageCount, isPaid }); // Debug log
      }
    };
  }, []);

  // Generate preview data for the selected component
  useEffect(() => {
    if (selectedComponent) {
      const initialToggles: Record<string, boolean> = {};
      selectedComponent.properties.forEach((prop) => {
        // Only include properties that pass the global filters
        const shouldInclude =
          prop.type === "VARIANT" ||
          (prop.type === "BOOLEAN" && includeBooleans) ||
          (prop.type === "EXPOSED_INSTANCE" && includeExposedInstances);

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

  const formatNumber = (num) => {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

const cleanPropertyName = (name) => {
  return name.split('#')[0];
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
  const remainingUses =
    typeof usageCount === "number"
      ? Math.max(0, FREE_USAGE_LIMIT - usageCount)
      : "unlimited";
  const usagePercentage =
    typeof usageCount === "number"
      ? (usageCount / FREE_USAGE_LIMIT) * 100
      : 100;

  // Generate combinations function
  const generateCombinations = (
    properties: ComponentProperty[]
  ): Record<string, string>[] => {
    let filteredProperties = properties;

    if (!includeBooleans) {
      filteredProperties = filteredProperties.filter(
        (prop) => prop.type !== "BOOLEAN"
      );
    }

    if (!includeExposedInstances) {
      filteredProperties = filteredProperties.filter(
        (prop) => prop.type !== "EXPOSED_INSTANCE"
      );
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

    const enabledProperties = selectedComponent.properties.filter((prop) => {
      // Apply global filters first
      if (prop.type === "BOOLEAN" && !includeBooleans) return false;
      if (prop.type === "EXPOSED_INSTANCE" && !includeExposedInstances)
        return false;

      // Then apply individual toggles
      return toggledProperties[prop.name];
    });

    if (enabledProperties.length === 0) return 0;

    return enabledProperties.reduce(
      (total, prop) => total * prop.values.length,
      1
    );
  };

  const handleGenerate = () => {
    if (selectedComponent) {
      const enabledProperties = selectedComponent.properties
        .filter((prop) => {
          // Apply global filters
          if (prop.type === "BOOLEAN" && !includeBooleans) return false;
          if (prop.type === "EXPOSED_INSTANCE" && !includeExposedInstances)
            return false;
          // Apply individual toggles
          return toggledProperties[prop.name];
        })
        .map((prop) => prop.name);

      parent.postMessage(
        {
          pluginMessage: {
            type: "generate-table",
            componentId: selectedComponent.id,
            spacing: spacing,
            enabledProperties: enabledProperties,
          },
        },
        "*"
      );
    }
  };


  // Generate table columns dynamically based on component properties
  const selectedComponentData = selectedComponent;
  let filteredProperties = selectedComponentData
    ? selectedComponentData.properties
    : [];

  if (!includeBooleans) {
    filteredProperties = filteredProperties.filter(
      (prop) => prop.type !== "BOOLEAN"
    );
  }

  if (!includeExposedInstances) {
    filteredProperties = filteredProperties.filter(
      (prop) => prop.type !== "EXPOSED_INSTANCE"
    );
  }

  // Generate table columns dynamically based on filtered component properties
  const tableColumns =
    filteredProperties.length > 0
      ? [
          ...filteredProperties.map((property) => ({
            title: `${property.name} (${
              property.type === "EXPOSED_INSTANCE"
                ? "exposed"
                : property.type.toLowerCase()
            })`,
            dataIndex: property.name,
            key: property.name,
            render: (value: string) => {
              let color = "blue";
              if (property.type === "BOOLEAN") {
                color = value === "true" ? "green" : "red";
              } else if (property.type === "EXPOSED_INSTANCE") {
                color = "purple";
              }
              return <Tag color={color}>{value}</Tag>;
            },
          })),
          {
            title: "Preview",
            dataIndex: "preview",
            key: "preview",
            render: (text: string) => <Text type="secondary">{text}</Text>,
          },
        ]
      : [];

  return (
    <div style={{ padding: "12px", fontFamily: "Inter, sans-serif" }}>
      <Space direction="vertical" size={4} style={{ width: "100%" }}>
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
        <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <Button size="small" onClick={toggleDevPaymentStatus}>
            Toggle Payment
          </Button>
          <Button size="small" onClick={resetUsageCount}>
            Reset Usage
          </Button>
        </div>

       


      <Card
        style={{
          position: "relative",
          border: "1px dashed #d9d9d9",
          backgroundImage: "radial-gradient(#e0e0e0 1px, transparent 1px)",
          backgroundSize: "16px 16px",
          height: 150,
          padding: 0,
        }}
        bodyStyle={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >


{selectedComponent && (() => {
  const totalBooleans = selectedComponentData?.properties.filter(p => p.type === "BOOLEAN").length || 0;
  const totalExposed = selectedComponentData?.properties.filter(p => p.type === "EXPOSED_INSTANCE").length || 0;
  
  const hiddenBooleans = !includeBooleans ? totalBooleans : 0;
  const hiddenExposed = !includeExposedInstances ? totalExposed : 0;
  
  const parts = [];
  const statusParts = [];
  
  // ✅ NEW - Show what's hidden
  if (hiddenBooleans > 0) parts.push(`${hiddenBooleans} Boolean`);
  if (hiddenExposed > 0) parts.push(`${hiddenExposed} Nested`);
  
  // ✅ NEW - Show what doesn't exist
  if (totalBooleans === 0 && !includeBooleans) statusParts.push("No Boolean ");
  if (totalExposed === 0 && !includeExposedInstances) statusParts.push("No Nested ");
  
  // Combine hidden and missing info
  const allParts = [...parts];
  if (parts.length > 0 && statusParts.length > 0) {
    allParts.push(`(${statusParts.join(', ')}  Available)`);
  } else if (parts.length === 0 && statusParts.length > 0) {
    allParts.push(`${statusParts.join(', ')}  Available`);
  }
  
  // Determine tag color and message
  let color = "orange";
  let message = "";
  
  if (parts.length > 0) {
    // Something is hidden
    color = "orange";
    message = `${parts.join(', ')} Hidden`;
    if (statusParts.length > 0) {
      message += ` • ${statusParts.join(', ')}  Available`;
    }
  } else if (statusParts.length > 0) {
    // Nothing hidden, but some types don't exist
    color = "cyan";
    message = `${statusParts.join(', ')} Properties Available`;
  }
  
  return message && (
    <div
      style={{
        position: "absolute",
        top: "12px",
        left: "12px",
        zIndex: 1,
      }}
    >
      <Tag color={color} size="small">
        {message}
      </Tag>
    </div>
  );
})()}
        
{selectedComponent && (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        left: "12px",
        zIndex: 1,
      }}
    >
      <Tag color="blue">
       Found {selectedComponent.properties.length} Properties
      </Tag>
    </div>
  )}
   {/* Total combinations in bottom-right corner */}
  {selectedComponent && (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        right: "12px",
        zIndex: 1,
      }}
    >
      <Tag color="green">
        Total {formatNumber(calculateCombinations())} Combinations
      </Tag>
    </div>
  )}

  {/* Center content */}
  {!selectedComponent ? (
    <div style={{ padding: "20px" }}>

        <Text type="secondary" style={{ maxWidth: 220, textAlign: "center" }}>
            
              Select Any component or an Instance from a canvas to generate combinations
            
          </Text>
    </div>
  ) : (
    <div style={{ padding: "20px" }}>
      <Text style={{ fontSize: "14px", color: "#52c41a" }}>
        Selected Component
      </Text>
      <br />
      <Text code style={{ fontSize: "16px", marginTop: "8px" }}>
        {selectedComponent.name}
      </Text>
    </div>
  )}


      
      </Card>
        {/* Component Properties Section */}

        <Text
  style={{
    fontSize: "12px",
    color: "#888",
    marginTop: "12px",
    marginBottom: "8px",
    display: "block",
    fontWeight: "bold",
  }}
>
  Settings
</Text>

   
   <div style={{ display: "flex", flexDirection: "column" }}>
  <div
    style={{
      display: "flex",
      gap: "8px",
     
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontSize: "12px",
        color: "#888",
        marginTop: "12px",
      
        display: "block",
      }}
    >
      Boolen Properties
    </Text>
    <Space>
      <Switch
        checked={includeBooleans}
        onChange={setIncludeBooleans}
        size="small"
      />
    </Space>
  </div>

  <div
    style={{
      display: "flex",
      gap: "8px",
     
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <Text
      style={{
        fontSize: "12px",
        color: "#888",
        marginTop: "12px",
    
        display: "block",
      }}
    >
      Nested Instances
    </Text>
    <Space>
      <Switch
        checked={includeExposedInstances}
        onChange={setIncludeExposedInstances}
        size="small"
      />
    </Space>
  </div>
</div>
  <Text
  style={{
    fontSize: "12px",
    color: "#888",
    marginTop: "12px",
    marginBottom: "8px",
    display: "block",
    fontWeight: "bold",
  }}
>
 Component Properties
</Text>



{selectedComponentData ? (
  <Space direction="vertical" size={2} style={{ width: "100%" }}>
    {(() => {
      // Filter properties based on global settings
      const filteredProperties = selectedComponentData.properties.filter((property) => {
        if (property.type === "BOOLEAN" && !includeBooleans) return false;
        if (property.type === "EXPOSED_INSTANCE" && !includeExposedInstances) return false;
        return true;
      });

      // ✅ NEW - Check if there are any properties to show
      if (filteredProperties.length === 0) {
        return (
          <Card style={{ marginTop: "16px" }}>
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Text type="secondary" style={{ fontSize: "14px" }}>
                {selectedComponentData.properties.length === 0 
                  ? "This component has no configurable properties"
                  : "No properties match current filter settings. Try enabling Boolean or Nested Instance properties above."
                }
              </Text>
            </div>
          </Card>
        );
      }

      // Show properties if they exist
      return (
        <Card style={{ marginTop: "16px"}} bodyStyle={{ padding: "4px 2px" }}>
          <Space direction="vertical" size={2} style={{ width: "100%" }}>
            {filteredProperties.map((property) => (
              <div
                key={property.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 12px",
                }}
              >
                {/* Left side - Icon, Property name and type tag */}
                <Space align="center" size={2}>
                  {/* Property type icon */}
                  {property.type === "VARIANT" && <VariantIcon />}
                  {property.type === "BOOLEAN" && <BooleanIcon />}
                  {property.type === "EXPOSED_INSTANCE" && <NestedIcon />}
                  
                  <Text code>{cleanPropertyName(property.name)}</Text>
                  <Tag
                    size="small"
                    color={
                      property.type === "VARIANT"
                        ? "blue"
                        : property.type === "BOOLEAN"
                        ? "green"
                        : "purple"
                    }
                  >
                    {property.type === "EXPOSED_INSTANCE"
                      ? "Nested"
                      : property.type.toLowerCase()}
                  </Tag>
                </Space>

                {/* Right side - Toggle switch */}
                <Switch
                  checked={toggledProperties[property.name] || false}
                  onChange={(checked) =>
                    setToggledProperties((prev) => ({
                      ...prev,
                      [property.name]: checked,
                    }))
                  }
                  size="small"
                />
              </div>
            ))}
          </Space>
        </Card>
      );
    })()}
  </Space>
) : (
  <Card style={{ marginTop: "16px" }}>
    <div style={{ textAlign: "center", padding: "12px" }}>
      <Text type="secondary" style={{ fontSize: "14px" }}>
        Component properties will appear here once you select a component
      </Text>
    </div>
  </Card>
)}


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

       

          <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "92%",
            padding: "12px 16px",
            backgroundColor: "#fff",
            borderTop: "1px solid #eee",
            boxShadow: "0 -2px 8px rgba(0,0,0,0.05)",
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
         <Button
  type="primary"
  onClick={handleGenerate}
  disabled={
    !selectedComponent ||
    calculateCombinations() === 0 ||
    (typeof usageCount === "number" &&
      usageCount >= FREE_USAGE_LIMIT &&
      !isPaid)
  }
  icon={<PlayCircleOutlined />}
>
  {(() => {
    // ✅ NEW - Better button text based on state
    if (!isPaid && typeof usageCount === "number" && usageCount >= FREE_USAGE_LIMIT) {
      return "Upgrade Required";
    }
    if (!selectedComponent) {
      return "Select Component";
    }
    if (calculateCombinations() === 0) {
      return selectedComponent?.properties.length === 0 
        ? "No Properties Found"
        : "Enable Properties Above";
    }
    return "Generate Table";
  })()}
</Button>

            {/* Add premium indicator button */}
            <Button
              icon={isPaid ? <UnlockOutlined /> : <LockOutlined />}
              type="dashed"
              onClick={!isPaid ? initiatePayment : undefined}
              disabled={isPaid}
              title={
                isPaid ? "Premium features unlocked" : "Unlock premium features"
              }
            />
        </div>

        <div style={{ height: "60px" }}></div>

        
      </Space>
    </div>
  );
};

export default App;
