import os

from jira import JIRA
from generate_report import _load_results


if not os.getenv("JIRA_TOKEN"):
    raise Exception("JIRA_TOKEN is not set")

if not os.getenv("JIRA_EMAIL"):
    raise Exception("JIRA_EMAIL is not set")

if not os.getenv("JIRA_SERVER"):
    raise Exception("JIRA_SERVER is not set")

if not os.getenv("JIRA_PROJECT"):
    raise Exception("JIRA_PROJECT is not set")


JIRA_PROJECT = os.getenv("JIRA_PROJECT")


jira = JIRA(
    os.getenv("JIRA_SERVER"),
    basic_auth=(os.getenv("JIRA_EMAIL"), os.getenv("JIRA_TOKEN"),)
)


def _create_jira_issue(project, summary, description):

    new_issue = jira.create_issue(
        project=project,
        summary=summary,
        description=description,
        issuetype={'name': 'Bug'},
    )

    return new_issue


def create_jira_issues():
    results = _load_results("output")

    for section, section_results in results.items():
        for category, category_results in section_results.items():
            category = category.split(".")[1].capitalize()
            for _result in category_results:
                if _result["success"] is True:
                    continue

                # We don't create issues when the problem is on our end
                if _result["internal_error"] is True:
                    continue

                issue = _create_jira_issue(JIRA_PROJECT, section + " - " + category + " - " + _result["reason"], _result["test_description"])
                jira.add_attachment(issue=issue, attachment=f"output/{section}/gifs/{_result['test_id']}.gif")
                exit()
