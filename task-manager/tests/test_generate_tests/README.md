## ❓ Problem

Every time we update the **Test Generation** feature—particularly its prompt logic—we need confidence that the new version (Version B) produces better tests than the previous one (Version A).

**Challenge:**

How can we *objectively evaluate the quality* of generated tests to ensure improvements over time?

---

## 💡 Approach & Solution

To address this, we created a comprehensive **integration test framework** that runs the full test generation pipeline and evaluates output using multiple quality dimensions. This includes:

- ✅ **Execution Success Rate**
- 📊 **UI Coverage Analysis**
- 🧠 **Category Alignment (Prompt Accuracy)**
- ♻️ **Redundancy Detection**
- 🚦**Intent Alignment**

These dimensions are combined into a **composite score**, helping us **compare prompt versions** and measure whether changes lead to better test output.

---

## 🧠 AI-Based Analysis

We leverage **GPT-4 agents** via LangChain to analyze qualitative aspects that are otherwise hard to measure programmatically:

- UI coverage metrics
- Redundancy overlap
- Category matching
- Intent Alignment

This turns subjective test evaluation into structured, machine-readable metrics.

---

## 📂 File Overview

| File | Purpose |
| --- | --- |
| `test_generate_tests.py` | Main integration script that executes the full test flow and triggers all analysis. Asserts quality thresholds. |
| `analyze_ui_coverage.py` | Uses GPT-4 to analyze UI coverage across tests: selectors, pages, elements. |
| `analyze_redundancy.py` | Uses GPT-4 to detect redundant test pairs and provide clustering & consolidation suggestions. |
| `analyze_execution_rate.py` | Analyzes how many generated tests execute successfully and calculates a pass/fail rate. |
| `analyze_category_match.py` | Verifies that generated tests align with the requested category (e.g., SMOKE) using GPT-4. |
| `analyze_intent_alignment.py` | Analyze the alignment between a generated test and the user's intent using GPT-4. |

---

## 🥮 Test Input (Dummy Data)

```
    # Create dummy test data
    product = Product(
        name="Test Product",
        url="https://qacrmdemo.netlify.app/",
        description="A test product",
        documentation="https://qacrmdemo.netlify.app/",
        links_to_documentation=["https://qacrmdemo.netlify.app/"]
    )
    
    epic = Epic(
        name="Test Epic",
        description="A test epic"
    )
    
    feature = Feature(
        id="test-feature-123",
        name="Test Web App Functionality",
        description="Test the web app functionality",
        urls=["https://qacrmdemo.netlify.app/"]
    )
    
    # Context with job ID
    ctx = {
        "job_id": "test-job-123"
    }
    
    # Requested category
    requested_category = TestCategory.NEGATIVE.value
```

## 🥮 Test Output (Sample Run)

[Finalized Documented Test](https://www.notion.so/Finalized-Documented-Test-1f98725a327b80108950cb441245a9d2?pvs=21)

[Testing the Test Data](https://www.notion.so/Testing-the-Test-Data-1fa8725a327b8072a747ef551ce8e882?pvs=21)

---

## ✅ Conclusion

This framework now allows us to **quantitatively evaluate prompt changes** in the Test Generation feature.