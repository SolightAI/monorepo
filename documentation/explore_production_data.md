## Plot the number of tests run per day by organization

### Step 1. Download a csv of the following query
```sql
SELECT
    te.started_at,
    o.name AS organization_name
FROM
    test_executions te
JOIN
    tests t ON te.test_id = t.id
JOIN
    features f ON t.feature_id = f.id
JOIN
    epics e ON f.epic_id = e.id
JOIN
    products p ON e.product_id = p.id
JOIN
    organizations o ON p.organization_id = o.id
ORDER BY
    te.started_at DESC;
```

### Step 2. Run this python script

cmd: `python documentation/plot_nb_test_run_per_org.py path_to_data.csv`


## Retrieve all the test a user has access to
```sql
SELECT
    p.name AS product_name,
    f.name AS feature_name,
    t.id,
    t.name,
	t.category,
    t.description,
    t.preconditions,
	t.assertions,
    t.steps
FROM
    tests AS t
JOIN
    features AS f ON t.feature_id = f.id
JOIN
    epics AS e ON f.epic_id = e.id
JOIN
    products AS p ON e.product_id = p.id
JOIN
    organization_members AS om ON p.organization_id = om.organization_id
WHERE
    om.user_id = 'please_replace_by_user_id'
ORDER BY
    om.organization_id,
    p.name,
    f.name,
    t.category;
```

## Misc

### Retrieve all the test run of a given organization
```sql
SELECT te.*
FROM test_executions te
JOIN tests t ON te.test_id = t.id
JOIN features f ON t.feature_id = f.id
JOIN epics e ON f.epic_id = e.id
JOIN products p ON e.product_id = p.id
WHERE p.organization_id = 'your_organization_id_here';
```

### Retrieve the user's organization
```sql
SELECT organization_id
FROM organization_members
WHERE user_id = 'user_id';
```

### Retrieve the products of an organization
```sql
SELECT id
FROM products
WHERE organization_id = 'organization_id';
```

### Retrieve the features of a product
```sql
SELECT f.id
FROM features AS f
JOIN epics AS e ON f.epic_id = e.id
JOIN products AS p ON e.product_id = p.id
WHERE p.id = 'product_id';
```

### Retrieve the tests of a feature
```sql
SELECT
    t.id,
    t.name,
    t.description,
    t.preconditions,
    t.steps,
    t.assertions,
    t.category,
    t.feature_id
FROM
    tests AS t
WHERE
    t.feature_id = 'your_feature_id_here';
```