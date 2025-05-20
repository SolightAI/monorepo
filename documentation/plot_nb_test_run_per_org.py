import argparse
import pandas as pd
import matplotlib.pyplot as plt


def plot_csv_timestamps(csv_file_path, skip_orgs=None):
    """
    Reads a CSV file with a 'started_at' column and plots a histogram of the timestamps.

    Args:
        csv_file_path (str): The path to the CSV file.
        skip_orgs (list, optional): A list of organization names to skip. Defaults to None.
    """
    try:
        # Read the CSV file
        df = pd.read_csv(csv_file_path)

        # Check if 'started_at' column exists
        if 'started_at' not in df.columns:
            print(f"Error: Column 'started_at' not found in {csv_file_path}")
            return

        # Check if 'organization_name' column exists
        if 'organization_name' not in df.columns:
            print(f"Error: Column 'organization_name' not found in {csv_file_path}")
            return

        # Filter out skipped organizations
        if skip_orgs:
            df = df[~df['organization_name'].isin(skip_orgs)]
            if df.empty:
                print(f"No data left after filtering out specified organizations: {', '.join(skip_orgs)}")
                return

        df['started_at'] = pd.to_datetime(df['started_at'], errors='coerce')

        # Drop rows where conversion might have failed
        df.dropna(subset=['started_at'], inplace=True)

        if df.empty:
            print("No valid timestamps found in the 'started_at' column.")
            return

        # Extract date and count tests per day per organization
        df['date'] = df['started_at'].dt.date
        # Group by date and organization, then count occurrences
        # Unstack organization_name to columns for plotting, fill missing with 0
        # This gives counts only for days where tests actually ran for some organization
        raw_daily_counts_by_org = df.groupby(['date', 'organization_name']).size().unstack(fill_value=0)

        # If there's no data at all after grouping (e.g., no valid orgs, or org column was all NaN),
        # then we can't proceed to plot.
        if raw_daily_counts_by_org.empty:
            print("No data to plot: The grouping by day and organization resulted in no data (e.g., 'organization_name' might be empty or all NaN).")
            return

        # Determine the full date range from the original data's dates.
        # This ensures we cover all days from the first test to the last test recorded in the input.
        min_date_in_data = df['date'].min() 
        max_date_in_data = df['date'].max()

        # Create a complete index of all days in the range.
        # pd.date_range creates a DatetimeIndex (array of pd.Timestamp objects).
        all_days_in_range_idx = pd.date_range(start=min_date_in_data, end=max_date_in_data, freq='D')

        # The index of raw_daily_counts_by_org currently consists of datetime.date objects
        # (because df['date'] was created from .dt.date).
        # Convert this index to pd.Timestamp objects to match the type of all_days_in_range_idx
        # for correct reindexing.
        raw_daily_counts_by_org.index = pd.to_datetime(raw_daily_counts_by_org.index)

        # Reindex raw_daily_counts_by_org to include all days in all_days_in_range_idx.
        # Days not present in raw_daily_counts_by_org (i.e., days with no tests)
        # will be added with a fill_value of 0 for all organization columns.
        daily_counts_by_org = raw_daily_counts_by_org.reindex(all_days_in_range_idx, fill_value=0)

        # Now, daily_counts_by_org has a row for every day in the range [min_date_in_data, max_date_in_data],
        # with test counts (or 0 if no tests ran on a particular day).

        # Plot the number of tests per day, stacked by organization
        plt.figure(figsize=(12, 6))
        daily_counts_by_org.plot(kind='bar', stacked=True, edgecolor='black', ax=plt.gca()) # Use current axes
        plt.title('Number of Tests Run Per Day by Organization')
        plt.xlabel('Date')
        plt.ylabel('Number of Tests Run')

        # Format x-axis ticks to show 'month-day'
        # The daily_counts_by_org.index is a DatetimeIndex containing pd.Timestamp objects.
        # We want to label the bars at positions 0, 1, 2, ... with formatted dates.
        tick_positions = range(len(daily_counts_by_org.index))
        date_labels = [timestamp.strftime('%m/%d') for timestamp in daily_counts_by_org.index]
        plt.xticks(ticks=tick_positions, labels=date_labels, rotation=45, ha='right') # ha='right' improves alignment

        plt.tight_layout()
        plt.show()

    except FileNotFoundError:
        print(f"Error: File not found at {csv_file_path}")
    except Exception as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Plot timestamps from a CSV file.")
    parser.add_argument("csv_file", help="Path to the CSV file containing a 'started_at' column.")
    parser.add_argument("--skip-orgs", nargs='*', help="List of organization names to skip in the plot.")
    args = parser.parse_args()

    plot_csv_timestamps(args.csv_file, args.skip_orgs)
