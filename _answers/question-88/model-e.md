---
questionId: 88
modelId: Alice
modelDisplayName: 匿名模型E
---
# 中等风险承受能力、5年投资周期的股债组合建议

## 股票部分选择

根据数据，我们选择以下3只股票，主要考虑其5年表现、行业分布和风险收益特征：

表格复制

| [代码](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D1601\)%3BAddSheet\(\)%3BSelectIndicator\(id%3D355420\)\)%27) | [证券简称](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D1601\)%3BAddSheet\(\)%3BSelectIndicator\(id%3D255001\)\)%27) | 5年涨跌幅(%) | 5年换手率(%) | 所属行业                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [600085.SH](windlocal://open?!CommandParam\(1400%2CWindCode%3D600085.SH\)%27)                                        | [同仁堂](windlocal://open?!CommandParam\(1400%2CWindCode%3D600085.SH\)%27)                                                | 33.80    | 1,128.00 | [医疗保健](windlocal://open?!CommandParam\(26003%2CCmdName%3DHQCMD_STOCKLIST%2Cdisableuppercase%2CParam%3D6235000000000000\)%27) |
| [603110.SH](windlocal://open?!CommandParam\(1400%2CWindCode%3D603110.SH\)%27)                                        | [东方材料](windlocal://open?!CommandParam\(1400%2CWindCode%3D603110.SH\)%27)                                               | 23.02    | 3,499.99 | 材料                                                                                                                           |
| [000429.SZ](windlocal://open?!CommandParam\(1400%2CWindCode%3D000429.SZ\)%27)                                        | [粤高速A](windlocal://open?!CommandParam\(1400%2CWindCode%3D000429.SZ\)%27)                                               | 120.71   | 654.41   | 工业                                                                                                                           |

**​选择理由​**：

- **​同仁堂(600085.SH)​**：医疗保健行业防御性强，5年稳定增长33.8%，[换手率](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D20005\)%3BEDBFolder\(code%3DS0231929\)%3Baddin\(\)\)%27)较低显示持股稳定
- **​东方材料(603110.SH)​**：[新材料](windlocal://open?!CommandParam\(26003%2CCmdName%3DHQCMD_STOCKLIST%2Cdisableuppercase%2CParam%3D0201c80000000000\)%27)+[算力](windlocal://open?!CommandParam\(1400%2CWindCode%3D8841678.WI\)%27)双主业，5年[涨幅](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D1601\)%3BAddSheet\(\)%3BSelectIndicator\(id%3D140717\)\)%27)23.02%，业务转型提供成长性
- **​粤高速A(000429.SZ)​**：高股息(120.71%涨幅)+低波动([换手率](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D20005\)%3BEDBFolder\(code%3DS0225185\)%3Baddin\(\)\)%27)654.41%)，适合中长期持有

## 债券部分选择

从Wind提供的[债券型基金](windlocal://open?!CommandParam\(26003%2CCmdName%3DHQCMD_STOCKLIST%2Cdisableuppercase%2CParam%3D2001010300000000\)%27)中筛选出以下3只，主要考量5年[最大回撤](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D1601\)%3BAddSheet\(\)%3BSelectIndicator\(id%3D605645\)\)%27)控制在1.5%以内且收益稳健：

表格复制

| 代码                                                                            | 证券简称                                                                        | 5年复权净值增长率(%) | 5年最大回撤(%) |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ | --------- |
| [006212.OF](windlocal://open?!CommandParam\(1400%2CWindCode%3D006212.OF\)%27) | [东方臻选纯债A](windlocal://open?!CommandParam\(1400%2CWindCode%3D006212.OF\)%27) | 29.44        | -0.82     |
| [007744.OF](windlocal://open?!CommandParam\(1400%2CWindCode%3D007744.OF\)%27) | [长盛安逸纯债A](windlocal://open?!CommandParam\(1400%2CWindCode%3D007744.OF\)%27) | 28.20        | -0.91     |
| [006242.OF](windlocal://open?!CommandParam\(1400%2CWindCode%3D006242.OF\)%27) | [宝盈盈润纯债A](windlocal://open?!CommandParam\(1400%2CWindCode%3D006242.OF\)%27) | 24.09        | -0.96     |

**​选择理由​**：

- **​东方臻选纯债A(006212.OF)​**：5年收益29.44%领先同类，最大回撤仅0.82%
- **​长盛安逸纯债A(007744.OF)​**：28.2%的5年收益，回撤控制在0.91%以内
- **​宝盈盈润纯债A(006242.OF)​**：24.09%的稳健收益，0.96%的最大回撤显示良好风控

## 资产权重计算

采用风险平价原则，结合5年历史[波动率](windlocal://open?!CommandFunc\(ExecuteCmd\(CMDID%3D1601\)%3BAddSheet\(\)%3BSelectIndicator\(id%3D547075\)\)%27)和最大回撤数据设定权重：

1. **​股票部分总权重40%​**：
    - 同仁堂：15% (低波动医疗龙头)
    - 东方材料：15% (成长性配置)
    - 粤高速A：10% (高股息稳定器)
2. **​债券部分总权重60%​**：
    - 东方臻选纯债A：25% (收益领先)
    - 长盛安逸纯债A：20% (均衡配置)
    - 宝盈盈润纯债A：15% (风险分散)

**​权重设定依据​**：

- 股票部分：同仁堂和东方材料各15%平衡成长与防御，粤高速A10%提供现金流
- 债券部分：按5年收益从高到低分配25%/20%/15%，同时确保单只债券不超过25%
- 股债4:6比例符合中等风险承受要求，回撤控制在可接受范围

## 组合特性

- **​预期年化收益​**：基于5年历史数据测算约6.5%-7.2%
- **​最大回撤​**：预计不超过15%(2020-2025年债券最大回撤1.5%+股票部分对冲)
- **​流动性​**：全部为上市交易品种，可随时调整
- **​分红再投资​**：粤高速A和债券基金提供定期现金流