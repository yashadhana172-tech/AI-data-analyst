import os
import random
import csv
import datetime

def generate_sample_data():
    os.makedirs('data', exist_ok=True)
    os.makedirs('reports', exist_ok=True)

    categories = {
        'Technology': [
            ('MacBook Pro 16-Inch', 2499.00, 1800.00),
            ('Dell XPS 15', 1899.00, 1350.00),
            ('ThinkPad X1 Carbon', 1650.00, 1150.00),
            ('iPad Pro 12.9', 1099.00, 750.00),
            ('Samsung Galaxy S24 Ultra', 1299.00, 890.00),
            ('Sony WH-1000XM5 Headphones', 399.00, 240.00),
            ('Logitech MX Master 3S', 99.00, 55.00),
            ('Dell 4K UltraSharp 27-Inch', 620.00, 410.00),
            ('CalDigit TS4 Thunderbolt Dock', 399.00, 260.00),
            ('Keychron Q1 Pro Keyboard', 199.00, 120.00)
        ],
        'Furniture': [
            ('Herman Miller Aeron Chair', 1395.00, 920.00),
            ('Steelcase Gesture Chair', 1250.00, 820.00),
            ('Jarvis Bamboo Standing Desk', 780.00, 490.00),
            ('Autonomous SmartDesk Pro', 650.00, 410.00),
            ('Ergonomic Monitor Arm Dual', 149.00, 85.00),
            ('LED Desk Task Light', 79.00, 38.00),
            ('Under-Desk Filing Cabinet', 210.00, 130.00),
            ('Acoustic Privacy Panel', 180.00, 95.00)
        ],
        'Office Supplies': [
            ('Moleskine Smart Notebook Set', 45.00, 22.00),
            ('Premium Gel Pen 12-Pack', 24.00, 9.00),
            ('Neodymium Magnetic Whiteboard', 160.00, 85.00),
            ('Heavy Duty Paper Shredder', 220.00, 130.00),
            ('Thermal Label Printer', 175.00, 98.00),
            ('Ergonomic Footrest Cushion', 49.00, 22.00),
            ('Cable Management Rack Tray', 35.00, 14.00)
        ],
        'Electronics Accessories': [
            ('Anker 100W GaN Fast Charger', 65.00, 32.00),
            ('Samsung T7 Shield 2TB SSD', 189.00, 120.00),
            ('Logitech Brio 4K Webcam', 199.00, 115.00),
            ('Blue Yeti USB Microphone', 129.00, 75.00),
            ('Belkin MagSafe 3-in-1 Stand', 149.00, 88.00),
            ('Elgato Stream Deck MK.2', 149.00, 92.00)
        ]
    }

    regions = ['North', 'South', 'East', 'West', 'Central']
    payment_methods = ['Credit Card', 'PayPal', 'Wire Transfer', 'UPI', 'Corporate Net 30']

    first_names = ['Aarav', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Rohan', 'Isabella', 'Lucas', 'Mia', 'Vikram', 'Ava', 'Ethan', 'Charlotte', 'Priya', 'Amelia', 'Alexander', 'Harper', 'Aditya', 'Evelyn', 'Marcus', 'Chloe', 'Arjun', 'Grace', 'Daniel', 'Zoe', 'Kavita', 'Benjamin', 'Siddharth', 'Nora']
    last_names = ['Sharma', 'Smith', 'Johnson', 'Patel', 'Williams', 'Brown', 'Verma', 'Jones', 'Garcia', 'Miller', 'Mehta', 'Davis', 'Rodriguez', 'Martinez', 'Iyer', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Reddy', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White']

    customers = []
    for i in range(1, 151):
        c_name = f"{random.choice(first_names)} {random.choice(last_names)}"
        customers.append((f"CUST-{i:04d}", c_name))

    random.seed(42)
    start_date = datetime.date(2024, 1, 1)
    end_date = datetime.date(2025, 6, 30)
    days_range = (end_date - start_date).days

    rows = []
    for i in range(1, 1251):
        order_id = f"ORD-{2024000 + i}"
        dt = start_date + datetime.timedelta(days=random.randint(0, days_range))
        order_date = dt.strftime('%Y-%m-%d')
        cust_id, cust_name = random.choice(customers)
        category = random.choice(list(categories.keys()))
        product_name, unit_price, cost_unit = random.choice(categories[category])
        region = random.choice(regions)
        quantity = random.choices([1, 2, 3, 4, 5, 8, 10], weights=[45, 25, 15, 8, 4, 2, 1])[0]
        discount = random.choices([0.0, 0.05, 0.10, 0.15, 0.20, 0.25], weights=[50, 20, 15, 8, 5, 2])[0]
        
        subtotal = unit_price * quantity
        revenue = round(subtotal * (1 - discount), 2)
        total_cost = round(cost_unit * quantity, 2)
        profit = round(revenue - total_cost, 2)
        payment_method = random.choice(payment_methods)
        
        rows.append([
            order_id, order_date, cust_id, cust_name, product_name,
            category, region, quantity, unit_price, discount,
            revenue, total_cost, profit, payment_method
        ])

    target_path = os.path.join('data', 'sample_sales.csv')
    with open(target_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'order_id', 'order_date', 'customer_id', 'customer_name', 'product_name',
            'category', 'region', 'quantity', 'unit_price', 'discount',
            'revenue', 'cost', 'profit', 'payment_method'
        ])
        writer.writerows(rows)

    print(f"Generated {len(rows)} records in {target_path}")

if __name__ == '__main__':
    generate_sample_data()
