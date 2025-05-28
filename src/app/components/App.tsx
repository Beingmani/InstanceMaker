import React, { useState, useEffect } from "react";
import LoopingUpgradeButton from "./LoopingUpgradeButton";
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
  Progress,Tooltip
} from "antd";
import { BooleanIcon, VariantIcon, NestedIcon } from "./customIcons";
import {
  PlayCircleOutlined,
  ArrowRightOutlined,
  ArrowLeftOutlined,
  StarOutlined,
  CloseOutlined,
  UnlockOutlined,
  UserOutlined,
  LockOutlined,
  CrownOutlined,
  LeftOutlined,
  RightOutlined,
  ArrowDownOutlined,
  BorderOuterOutlined,
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

const UsageAlert = ({
  isPaid,
  usageCount,
  FREE_USAGE_LIMIT,
  usagePercentage,
  initiatePayment,
}) => {
  const showUpgrade = usageCount >= FREE_USAGE_LIMIT && !isPaid;

  const renderUsageText = () => {
    if (isPaid) {
      return (
        <span style={{ fontSize: "12px", color: "#52c41a" }}>Unlimited</span>
      );
    }
    if (showUpgrade) {
      return "No free generations";
    }
    return (
      <span>
        <span
          style={{ fontSize: "18px", fontWeight: "bold", color: "#1890ff" }}
        >
          {usageCount}
        </span>
        <span style={{ fontSize: "12px", fontWeight: "normal" }}>
          /{FREE_USAGE_LIMIT}
        </span>
      </span>
    );
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
      }}
    >
      <Text
        style={{
          fontSize: "12px",
          color: showUpgrade ? "#ff4d4f" : "inherit",
          fontWeight: showUpgrade ? 500 : "normal",
        }}
      >
        {renderUsageText()}
      </Text>
    </div>
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
  const [layoutDirection, setLayoutDirection] = useState<
    "optimal" | "horizontal" | "vertical"
  >("optimal");
  const [customColor, setCustomColor] = useState<string>("#6644CC");
  const [selectedTheme, setSelectedTheme] = useState<string>("purple");
const [isGenerating, setIsGenerating] = useState(false);
  const FREE_USAGE_LIMIT = 10;
  const themes = {
  purple: {
    name: "Purple",
    primary: { r: 0.4, g: 0.2, b: 0.8 },
    secondary: { r: 0.94, g: 0.94, b: 0.98 },
    stroke: { r: 0.85, g: 0.85, b: 0.9 },
    accent: { r: 0.7, g: 0.4, b: 1 }
  },
  blue: {
    name: "Ocean Blue",
    primary: { r: 0.2, g: 0.4, b: 0.8 },
    secondary: { r: 0.94, g: 0.96, b: 0.98 },
    stroke: { r: 0.85, g: 0.88, b: 0.9 },
    accent: { r: 0.4, g: 0.6, b: 1 }
  },
  green: {
    name: "Forest Green",
    primary: { r: 0.2, g: 0.6, b: 0.3 },
    secondary: { r: 0.94, g: 0.98, b: 0.95 },
    stroke: { r: 0.85, g: 0.9, b: 0.87 },
    accent: { r: 0.3, g: 0.8, b: 0.4 }
  },
  orange: {
    name: "Sunset Orange",
    primary: { r: 0.8, g: 0.4, b: 0.1 },
    secondary: { r: 0.98, g: 0.96, b: 0.94 },
    stroke: { r: 0.9, g: 0.88, b: 0.85 },
    accent: { r: 1, g: 0.6, b: 0.2 }
  },
    custom: {
    name: "Custom",
    primary: { r: 0.4, g: 0.27, b: 0.8 }, // Will be dynamically updated
    secondary: { r: 0.95, g: 0.95, b: 0.98 },
    stroke: { r: 0.9, g: 0.9, b: 0.92 },
    accent: { r: 0.6, g: 0.4, b: 0.9 }
  }
};


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
      setUsageCount(usageCount !== undefined ? usageCount : data?.usageCount);
      setIsPaid(isPaid !== undefined ? isPaid : data?.isPaid);
    } else if (type === "table-generation-complete") {
      console.log("Received table-generation-complete"); // Add this for debugging
      setIsGenerating(false);
    }
  };

  // Cleanup
  return () => {
    window.onmessage = null;
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

  // Function to convert hex to RGB
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.4, g: 0.27, b: 0.8 };
};

// Function to generate theme colors based on primary color
const generateCustomTheme = (primaryColor: string) => {
  const primary = hexToRgb(primaryColor);
  
  // Generate secondary color (very light version of primary)
  const secondary = {
    r: 0.9 + (primary.r * 0.1),
    g: 0.9 + (primary.g * 0.1),
    b: 0.9 + (primary.b * 0.1)
  };
  
  // Generate stroke color (light version of primary)
  const stroke = {
    r: 0.8 + (primary.r * 0.15),
    g: 0.8 + (primary.g * 0.15),
    b: 0.8 + (primary.b * 0.15)
  };
  
  // Generate accent color (lighter version of primary)
  const accent = {
    r: Math.min(1, primary.r + 0.2),
    g: Math.min(1, primary.g + 0.2),
    b: Math.min(1, primary.b + 0.2)
  };
  
  return { primary, secondary, stroke, accent };
};

  const formatNumber = (num) => {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1).replace(/\.0$/, "") + "B";
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return num.toString();
  };

  const cleanPropertyName = (name) => {
    return name.split("#")[0];
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
  setIsGenerating(true);
  
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

    let themeToSend;
    if (selectedTheme === 'custom') {
      themeToSend = {
        name: "Custom",
        ...generateCustomTheme(customColor)
      };
    } else {
      themeToSend = themes[selectedTheme];
    }

    parent.postMessage(
      {
        pluginMessage: {
          type: "generate-table",
          componentId: selectedComponent.id,
          spacing: spacing,
          enabledProperties: enabledProperties,
          layoutDirection: layoutDirection,
          theme: themeToSend
        },
      },
      "*"
    );
  } else {
    // If no component selected, stop loading immediately
    setIsGenerating(false);
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
        {/* <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
          <Button size="small" onClick={toggleDevPaymentStatus}>
            Toggle Payment
          </Button>
          <Button size="small" onClick={resetUsageCount}>
            Reset Usage
          </Button>
        </div> */}

        {!isPaid && <LoopingUpgradeButton onClick={initiatePayment} />}

<div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "12px"
  }}
>
  <Text
    style={{
      fontSize: "12px",
      color: "#888",
      fontWeight: "bold",
      display: "block"
    }}
  >
    Table Theme
  </Text>
  
  <div style={{ display: "flex", gap: 8 }}>
    {Object.entries(themes).slice(0, 4).map(([key, theme]) => (
      <Tooltip key={key} title={theme.name}>
        <Button
          type={selectedTheme === key ? 'primary' : 'dashed'}
          onClick={() => setSelectedTheme(key)}
          style={{
            width: "32px",
            height: "32px",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "3px",
              backgroundColor: `rgb(${Math.floor(theme.primary.r * 255)}, ${Math.floor(theme.primary.g * 255)}, ${Math.floor(theme.primary.b * 255)})`,
              border: "1px solid rgba(0,0,0,0.1)"
            }}
          />
        </Button>
      </Tooltip>
    ))}
    
    {/* Custom Color Button */}
    <Tooltip title="Custom Color">
      <Button
        type={selectedTheme === 'custom' ? 'primary' : 'dashed'}
        onClick={() => setSelectedTheme('custom')}
        style={{
          width: "32px",
          height: "32px",
          padding: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}
      >
        <div
          style={{
            width: "16px",
            height: "16px",
            borderRadius: "3px",
            background: `linear-gradient(45deg, ${customColor}, ${customColor}dd)`,
            border: "1px solid rgba(0,0,0,0.1)",
            position: "relative"
          }}
        >
          {/* Color picker input overlay */}
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              setSelectedTheme('custom');
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              cursor: "pointer"
            }}
          />
        </div>
      </Button>
    </Tooltip>
  </div>
</div>
         <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop:"12px"
          }}
        >
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
            Layout Direction
          </Text>
          <div style={{ display: "flex", gap: 8 }}>
           <Tooltip title="Auto-Optimal">
  <Button
    type={layoutDirection === 'optimal' ? 'primary' : 'dashed'}
    icon={<BorderOuterOutlined />}
    onClick={() => setLayoutDirection('optimal')}
  />
</Tooltip>

<Tooltip title="Horizontal">
  <Button
    type={layoutDirection === 'horizontal' ? 'primary' : 'dashed'}
    icon={<ArrowRightOutlined />}
    onClick={() => setLayoutDirection('horizontal')}
  />
</Tooltip>

<Tooltip title="Vertical">
  <Button
    type={layoutDirection === 'vertical' ? 'primary' : 'dashed'}
    icon={<ArrowDownOutlined />}
    onClick={() => setLayoutDirection('vertical')}
  />
</Tooltip>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <Text
            style={{
              fontSize: "12px",
              color: "#888",
              marginTop: "12px",
              display: "block",
              fontWeight: "bold",
            }}
          >
            Preview Window
          </Text>
          <UsageAlert
            isPaid={isPaid}
            usageCount={usageCount}
            FREE_USAGE_LIMIT={FREE_USAGE_LIMIT}
            usagePercentage={usagePercentage}
            initiatePayment={initiatePayment}
          />
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
          {selectedComponent &&
            (() => {
              const totalBooleans =
                selectedComponentData?.properties.filter(
                  (p) => p.type === "BOOLEAN"
                ).length || 0;
              const totalExposed =
                selectedComponentData?.properties.filter(
                  (p) => p.type === "EXPOSED_INSTANCE"
                ).length || 0;

              const hiddenBooleans = !includeBooleans ? totalBooleans : 0;
              const hiddenExposed = !includeExposedInstances ? totalExposed : 0;

              const parts = [];
              const statusParts = [];

              // ✅ NEW - Show what's hidden
              if (hiddenBooleans > 0) parts.push(`${hiddenBooleans} Boolean`);
              if (hiddenExposed > 0) parts.push(`${hiddenExposed} Nested`);

              // ✅ NEW - Show what doesn't exist
              if (totalBooleans === 0 && !includeBooleans)
                statusParts.push("No Boolean ");
              if (totalExposed === 0 && !includeExposedInstances)
                statusParts.push("No Nested ");

              // Combine hidden and missing info
              const allParts = [...parts];
              if (parts.length > 0 && statusParts.length > 0) {
                allParts.push(`(${statusParts.join(", ")}  Available)`);
              } else if (parts.length === 0 && statusParts.length > 0) {
                allParts.push(`${statusParts.join(", ")}  Available`);
              }

              // Determine tag color and message
              let color = "orange";
              let message = "";

              if (parts.length > 0) {
                // Something is hidden
                color = "orange";
                message = `${parts.join(", ")} Hidden`;
                if (statusParts.length > 0) {
                  message += ` • ${statusParts.join(", ")}  Available`;
                }
              } else if (statusParts.length > 0) {
                // Nothing hidden, but some types don't exist
                color = "cyan";
                message = `${statusParts.join(", ")} Properties Available`;
              }

              return (
                message && (
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
                )
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
              <Text
                type="secondary"
                style={{ maxWidth: 220, textAlign: "center" }}
              >
                Select Any component or an Instance from a canvas to generate
                combinations
              </Text>
            </div>
          ) : (
            <div style={{ padding: "20px" }}>
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
              const filteredProperties =
                selectedComponentData.properties.filter((property) => {
                  if (property.type === "BOOLEAN" && !includeBooleans)
                    return false;
                  if (
                    property.type === "EXPOSED_INSTANCE" &&
                    !includeExposedInstances
                  )
                    return false;
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
                          : "No properties match current filter settings. Try enabling Boolean or Nested Instance properties above."}
                      </Text>
                    </div>
                  </Card>
                );
              }

              // Show properties if they exist
              return (
                <Card
                  style={{ marginTop: "16px" }}
                  bodyStyle={{ padding: "4px 2px" }}
                >
                  <Space
                    direction="vertical"
                    size={2}
                    style={{ width: "100%" }}
                  >
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
                          {property.type === "EXPOSED_INSTANCE" && (
                            <NestedIcon />
                          )}

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
                Component properties will appear here once you select a
                component
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
            gap: "12px", // Add gap between buttons
          }}
        >
          <Tag
            icon={isPaid ? <CrownOutlined /> : <UserOutlined />}
            color={isPaid ? "gold" : "default"}
            style={{
              height: "32px", // Match button height
              lineHeight: "30px", // Adjust for icon + text alignment
              fontSize: "14px", // Match button font size
              borderRadius: "6px", // Match button border radius
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexShrink: 0, // Prevent shrinking
              margin: 0,
            }}
          >
            {isPaid ? "Premium" : "Free"}
          </Tag>
          <Button
  type="primary"
  onClick={handleGenerate}
  loading={isGenerating} // Add loading prop
  disabled={
    isGenerating || // Disable when generating
    !selectedComponent ||
    calculateCombinations() === 0 ||
    (typeof usageCount === "number" &&
      usageCount >= FREE_USAGE_LIMIT &&
      !isPaid)
  }
  icon={!isGenerating ? <PlayCircleOutlined /> : undefined} // Hide icon when loading
  style={{ width: "100%" }}
>
  {(() => {
    if (isGenerating) {
      return "Generating Table...";
    }
    if (
      !isPaid &&
      typeof usageCount === "number" &&
      usageCount >= FREE_USAGE_LIMIT
    ) {
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

          {/* Premium indicator button */}
          <Button
            icon={isPaid ? <UnlockOutlined /> : <LockOutlined />}
            type="dashed"
            onClick={!isPaid ? initiatePayment : undefined}
            disabled={isPaid}
            title={
              isPaid
                ? "Premium unlocked"
                : "Upgrade to access unlimited generations"
            }
            style={{ flexShrink: 0 }} // Prevent this button from shrinking
          />
        </div>
        <div style={{ height: "60px" }}></div>
      </Space>
    </div>
  );
};

export default App;
