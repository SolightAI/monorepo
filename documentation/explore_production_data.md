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


## Duplicate a product from one org to another
```sql
DO $$
DECLARE
    v_source_product_id UUID := 'YOUR_SOURCE_PRODUCT_ID_HERE'; -- <<< REPLACE THIS
    v_target_organization_id UUID := 'YOUR_TARGET_ORGANIZATION_ID_HERE'; -- <<< REPLACE THIS
    v_new_product_id UUID;
    v_epic_record RECORD;
    v_new_epic_id UUID;
    v_feature_record RECORD;
    v_new_feature_id UUID;
    v_user_story_record RECORD;
    v_acceptance_criteria_record RECORD;
    v_test_record RECORD;
BEGIN
    -- Step 1: Copy the Product to the target organization
    RAISE NOTICE 'Starting product copy from % to organization %', v_source_product_id, v_target_organization_id;

    INSERT INTO products (id, url, name, description, documentation, links_to_documentation, organization_id)
    SELECT
        gen_random_uuid(), -- Generate a new UUID for the copied product
        p.url,
        p.name || ' (Copy)', -- Append " (Copy)" to distinguish the new product
        p.description,
        p.documentation,
        p.links_to_documentation,
        v_target_organization_id -- Assign to the target organization
    FROM products p
    WHERE p.id = v_source_product_id
    RETURNING id INTO v_new_product_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Source product with ID % not found.', v_source_product_id;
    END IF;
    RAISE NOTICE 'Copied product. New product ID: %', v_new_product_id;

    -- Step 2: Copy Epics associated with the source product to the new product
    FOR v_epic_record IN
        SELECT * FROM epics WHERE product_id = v_source_product_id
    LOOP
        RAISE NOTICE 'Copying epic ID % (Name: %)', v_epic_record.id, v_epic_record.name;
        INSERT INTO epics (id, name, description, product_id)
        VALUES (
            gen_random_uuid(), -- New UUID for the epic
            v_epic_record.name,
            v_epic_record.description,
            v_new_product_id -- Link to the newly copied product
        )
        RETURNING id INTO v_new_epic_id;
        RAISE NOTICE '  New epic ID: %', v_new_epic_id;

        -- Step 3: Copy Features associated with the source epic to the new epic
        FOR v_feature_record IN
            SELECT * FROM features WHERE epic_id = v_epic_record.id
        LOOP
            RAISE NOTICE '  Copying feature ID % (Name: %)', v_feature_record.id, v_feature_record.name;
            INSERT INTO features (id, urls, name, description, access_conditions, epic_id)
            VALUES (
                gen_random_uuid(), -- New UUID for the feature
                v_feature_record.urls,
                v_feature_record.name,
                v_feature_record.description,
                v_feature_record.access_conditions,
                v_new_epic_id -- Link to the newly copied epic
            )
            RETURNING id INTO v_new_feature_id;
            RAISE NOTICE '    New feature ID: %', v_new_feature_id;

            -- Step 4: Copy User Stories for the new Feature
            FOR v_user_story_record IN
                SELECT * FROM user_stories WHERE feature_id = v_feature_record.id
            LOOP
                RAISE NOTICE '    Copying user story ID % (Name: %)', v_user_story_record.id, v_user_story_record.name;
                INSERT INTO user_stories (id, name, description, feature_id)
                VALUES (
                    gen_random_uuid(), -- New UUID for the user story
                    v_user_story_record.name,
                    v_user_story_record.description,
                    v_new_feature_id -- Link to the newly copied feature
                );
            END LOOP;

            -- Step 5: Copy Acceptance Criteria for the new Feature
            FOR v_acceptance_criteria_record IN
                SELECT * FROM acceptance_criteria WHERE feature_id = v_feature_record.id
            LOOP
                RAISE NOTICE '    Copying acceptance criterion ID % (Name: %)', v_acceptance_criteria_record.id, v_acceptance_criteria_record.name;
                INSERT INTO acceptance_criteria (id, name, description, feature_id)
                VALUES (
                    gen_random_uuid(), -- New UUID for the acceptance criterion
                    v_acceptance_criteria_record.name,
                    v_acceptance_criteria_record.description,
                    v_new_feature_id -- Link to the newly copied feature
                );
            END LOOP;

            -- Step 6: Copy Tests associated with the source feature to the new feature
            FOR v_test_record IN
                SELECT * FROM tests WHERE feature_id = v_feature_record.id
            LOOP
                RAISE NOTICE '    Copying test ID % (Name: %)', v_test_record.id, v_test_record.name;
                INSERT INTO tests (id, name, description, preconditions, steps, assertions, category, feature_id)
                VALUES (
                    gen_random_uuid(), -- New UUID for the test
                    v_test_record.name,
                    v_test_record.description,
                    v_test_record.preconditions,
                    v_test_record.steps,
                    v_test_record.assertions,
                    v_test_record.category, -- Assumes category is an enum/string that can be directly copied
                    v_new_feature_id -- Link to the newly copied feature
                );
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Successfully copied product % to new product ID % in organization %.', v_source_product_id, v_new_product_id, v_target_organization_id;
    RAISE NOTICE 'All associated epics, features, user stories, acceptance criteria, and tests have been copied.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'An error occurred: %', SQLERRM;
        RAISE;
END $$;
```


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
